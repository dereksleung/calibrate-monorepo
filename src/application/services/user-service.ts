import { BusinessLogicError, User } from "@domain";
import {
  CreateUserRequestDto,
  PasswordHasher,
  UserRepository,
} from "@application";

export interface UserService {
  createUser(props: CreateUserRequestDto): Promise<User>;
}

export class UserServiceImpl implements UserService {
  constructor(
    private readonly passwordHasher: PasswordHasher,
    private readonly userRepository: UserRepository,
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
