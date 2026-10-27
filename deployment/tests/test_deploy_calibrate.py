import importlib.util
import os
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "deploy_calibrate.py"
spec = importlib.util.spec_from_file_location("deploy_calibrate", SCRIPT)
deploy = importlib.util.module_from_spec(spec)
spec.loader.exec_module(deploy)


class UploadValidationTests(unittest.TestCase):
    def test_accepts_single_quoted_encrypted_configuration(self):
        deploy.validate_configuration(b"# production\nDB_HOST='postgres'\nDB_PASSWORD='encrypted:synthetic'\n")

    def test_rejects_shell_syntax_without_disclosing_the_value(self):
        with self.assertRaises(deploy.DeploymentError) as error:
            deploy.validate_configuration(b'DB_PASSWORD="sensitive-value-$(id)"\n')
        self.assertNotIn("sensitive-value", str(error.exception))

    def test_rejects_plaintext_secrets_duplicate_keys_and_uploaded_decryption_keys(self):
        for source in (
            b"DB_PASSWORD='plaintext-sensitive-value'\n",
            b"DB_HOST='postgres'\nDB_HOST='other'\n",
            b"DOTENV_PRIVATE_KEY_PRODUCTION='sensitive-value'\n",
            b"DOPPLER_TOKEN='sensitive-value'\n",
            b"# empty artifact\n",
        ):
            with self.subTest(source=source[:12]):
                with self.assertRaises(deploy.DeploymentError) as error:
                    deploy.validate_configuration(source)
                self.assertNotIn("sensitive-value", str(error.exception))

    def test_only_accepts_a_digest_in_the_approved_repository(self):
        image = "dereksleung407/calibrate@sha256:" + "a" * 64
        self.assertEqual(deploy.validate_image((image + "\n").encode()), image)
        for image in ("dereksleung407/calibrate:latest", "evil/image@sha256:" + "a" * 64,
                      image + "\n--privileged", "dereksleung407/calibrate@sha256:123"):
            with self.subTest(image=image):
                with self.assertRaises(deploy.DeploymentError):
                    deploy.validate_image(image.encode())

    def test_snapshots_regular_files_and_rejects_symlinks_directories_and_fifos(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory).resolve()
            (folder / "valid").write_bytes(b"candidate")
            (folder / "link").symlink_to(folder / "valid")
            (folder / "directory").mkdir()
            os.mkfifo(folder / "fifo")
            self.assertEqual(deploy.read_upload(folder, "valid", os.getuid(), 100), b"candidate")
            for name in ("link", "directory", "fifo"):
                with self.subTest(name=name):
                    with self.assertRaises(deploy.DeploymentError):
                        deploy.read_upload(folder, name, os.getuid(), 100)

    def test_rejects_oversized_and_wrong_owner_uploads(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory).resolve()
            (folder / "valid").write_bytes(b"candidate")
            with self.assertRaises(deploy.DeploymentError):
                deploy.read_upload(folder, "valid", os.getuid(), 3)
            with self.assertRaises(deploy.DeploymentError):
                deploy.read_upload(folder, "valid", os.getuid() + 1, 100)


if __name__ == "__main__":
    unittest.main()
