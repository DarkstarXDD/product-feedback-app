import { faker } from "@faker-js/faker"

export function createDummyUserData() {
  const password = faker.internet.password()

  return {
    username: faker.internet.username(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    confirmPassword: password,
    password: password,
  }
}
