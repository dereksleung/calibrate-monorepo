import { CreateUserRequestDto, IPasswordHasher, IUserRepository } from "@application";
import { BusinessLogicError, User } from "@domain";

export interface IUserService {
  createUser(props: CreateUserRequestDto): Promise<User>;
}

export class UserServiceImpl implements IUserService {
  constructor(
    private readonly passwordHasher: IPasswordHasher,
    private readonly userRepository: IUserRepository,
  ) {}

  async createUser(props: CreateUserRequestDto): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(props.email);
    console.log("existingUser", existingUser);
    if (existingUser) {
      throw new BusinessLogicError("User already exists");
    }
    const passwordHash = await this.passwordHasher.hash(props.password);
    const user = User.create({ email: props.email, passwordHash });
    const persistedUser = await this.userRepository.save(user);
    console.log("persistedUser", persistedUser);
    return persistedUser;
  }
}
