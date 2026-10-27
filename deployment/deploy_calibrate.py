#!/usr/bin/python3 -I
"""Root-owned, argument-free deployment entrypoint for the Calibrate Droplet."""

import os
from pathlib import Path
import re
import stat


class DeploymentError(Exception):
    """Fixed diagnostics that never include uploaded values or command output."""


def read_upload(directory, name, expected_uid, limit):
    """Snapshot one bounded regular file without following directory or file links."""
    directory_fd = os.open("/", os.O_RDONLY | os.O_DIRECTORY)
    try:
        for component in directory.parts[1:]:
            next_fd = os.open(component, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW,
                              dir_fd=directory_fd)
            os.close(directory_fd)
            directory_fd = next_fd
        fd = os.open(name, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK, dir_fd=directory_fd)
        with os.fdopen(fd, "rb") as stream:
            metadata = os.fstat(stream.fileno())
            if not stat.S_ISREG(metadata.st_mode) or metadata.st_uid != expected_uid:
                raise DeploymentError("Upload must be a regular file owned by deploy")
            if metadata.st_size > limit:
                raise DeploymentError("Upload exceeds its size limit")
            contents = stream.read(limit + 1)
            if not contents or len(contents) > limit:
                raise DeploymentError("Upload is empty or exceeds its size limit")
            return contents
    except OSError:
        raise DeploymentError("Cannot safely read staged upload") from None
    finally:
        os.close(directory_fd)


def validate_configuration(contents):
    try:
        source = contents.decode("utf-8")
    except UnicodeDecodeError:
        raise DeploymentError("Configuration must be UTF-8") from None
    if "\x00" in source:
        raise DeploymentError("Configuration contains a NUL byte")
    assignments = {}
    secret_names = {"DB_PASSWORD", "OTP_HMAC_KEY", "EMAIL_REQUEST_IP_HMAC_KEY",
                    "JWT_PRIVATE_KEY_PEM", "EMAIL_SERVICE_CREDENTIAL", "FOODDATA_CENTRAL_API_KEY"}
    for number, line in enumerate(source.splitlines(), 1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        match = re.fullmatch(r"([A-Za-z_][A-Za-z0-9_]*)='([^'\r\n]*)'", line)
        if not match:
            raise DeploymentError(f"Invalid configuration literal at line {number}")
        name, value = match.groups()
        if name in assignments:
            raise DeploymentError(f"Duplicate configuration setting at line {number}")
        if name.startswith("DOTENV_PRIVATE_KEY") or name == "DOPPLER_TOKEN":
            raise DeploymentError("Decryption credentials must not be uploaded")
        if name in secret_names and value and not value.startswith("encrypted:"):
            raise DeploymentError(f"Unencrypted secret at line {number}")
        assignments[name] = value
    if not assignments:
        raise DeploymentError("Configuration contains no settings")


def validate_image(contents):
    try:
        image = contents.decode("ascii").strip()
    except UnicodeDecodeError:
        raise DeploymentError("Invalid image reference") from None
    if not re.fullmatch(r"dereksleung407/calibrate@sha256:[0-9a-f]{64}", image):
        raise DeploymentError("Image must be a digest in dereksleung407/calibrate")
    return image
