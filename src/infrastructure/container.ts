import { DayLogController, UserController } from "@controllers";
import { DayLogService, DayLogServiceImpl } from "@services";
import {
  DayLogRepository,
  PasswordHasher,
  UserRepository,
  UserService,
} from "@application";
import { PostgresDayLogRepository } from "./persistence/repositories/index.js";
import { PostgresUserRepository } from "./persistence/repositories/postgres-user-repository.js";
import { UserServiceImpl } from "@services";
import { Argon2PasswordHasher } from "./security/argon2-password-hasher.js";

export class Container {
  private readonly dayLogRepository: DayLogRepository;
  private readonly dayLogService: DayLogService;
  private readonly dayLogController: DayLogController;
  private readonly userRepository: UserRepository;
  private readonly userService: UserService;
  private readonly userController: UserController;
  private readonly passwordHasher: PasswordHasher;

  constructor({
    dayLogRepository,
    dayLogService,
    dayLogController,
    userRepository,
    userService,
    userController,
    passwordHasher,
  }: {
    dayLogRepository?: DayLogRepository;
    dayLogService?: DayLogService;
    dayLogController?: DayLogController;
    userRepository?: UserRepository;
    userService?: UserService;
    userController?: UserController;
    passwordHasher?: PasswordHasher;
  }) {
    this.dayLogRepository = dayLogRepository ?? new PostgresDayLogRepository();
    this.dayLogService =
      dayLogService ?? new DayLogServiceImpl(this.dayLogRepository);
    this.dayLogController =
      dayLogController ?? new DayLogController(this.dayLogService);

    this.passwordHasher = passwordHasher ?? new Argon2PasswordHasher();
    this.userRepository = userRepository ?? new PostgresUserRepository();
    this.userService =
      userService ??
      new UserServiceImpl(this.passwordHasher, this.userRepository);
    this.userController =
      userController ?? new UserController(this.userService);
  }

  getDayLogService(): DayLogService {
    return this.dayLogService;
  }
  getDayLogRepository(): DayLogRepository {
    return this.dayLogRepository;
  }
  getDayLogController(): DayLogController {
    return this.dayLogController;
  }
  getUserService(): UserService {
    return this.userService;
  }
  getUserRepository(): UserRepository {
    return this.userRepository;
  }
  getUserController(): UserController {
    return this.userController;
  }
  getPasswordHasher(): PasswordHasher {
    return this.passwordHasher;
  }
}
