import { DayLogController, UserController } from "@controllers";
import { IDayLogService, DayLogServiceImpl } from "@services";
import {
  IDayLogRepository,
  IPasswordHasher,
  IUserRepository,
  IUserService,
} from "@application";
import { PostgresDayLogRepository } from "./persistence/repositories/index.js";
import { PostgresUserRepository } from "./persistence/repositories/postgres-user-repository.js";
import { UserServiceImpl } from "@services";
import { Argon2PasswordHasher } from "./security/argon2-password-hasher.js";

export class Container {
  private readonly dayLogRepository: IDayLogRepository;
  private readonly dayLogService: IDayLogService;
  private readonly dayLogController: DayLogController;
  private readonly userRepository: IUserRepository;
  private readonly userService: IUserService;
  private readonly userController: UserController;
  private readonly passwordHasher: IPasswordHasher;

  constructor({
    dayLogRepository,
    dayLogService,
    dayLogController,
    userRepository,
    userService,
    userController,
    passwordHasher,
  }: {
    dayLogRepository?: IDayLogRepository;
    dayLogService?: IDayLogService;
    dayLogController?: DayLogController;
    userRepository?: IUserRepository;
    userService?: IUserService;
    userController?: UserController;
    passwordHasher?: IPasswordHasher;
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

  getDayLogService(): IDayLogService {
    return this.dayLogService;
  }
  getDayLogRepository(): IDayLogRepository {
    return this.dayLogRepository;
  }
  getDayLogController(): DayLogController {
    return this.dayLogController;
  }
  getUserService(): IUserService {
    return this.userService;
  }
  getUserRepository(): IUserRepository {
    return this.userRepository;
  }
  getUserController(): UserController {
    return this.userController;
  }
  getPasswordHasher(): IPasswordHasher {
    return this.passwordHasher;
  }
}
