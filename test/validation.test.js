const { userSchema } = require("../validation/userSchema");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

// A user object that passes validation. Individual tests change one field.
const goodUser = {
  name: "Bob",
  email: "bob@sample.com",
  password: "Pa$$word20",
};

describe("user object validation tests", () => {
  it("1. doesn't permit a trivial password", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com", password: "password" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "password"),
    ).toBeDefined();
  });

  it("2. The user schema requires that an email be specified.", () => {
    const { error } = userSchema.validate(
      { name: "Bob", password: "Pa$$word20" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "email"),
    ).toBeDefined();
  });

  it("3. The user schema does not accept an invalid email.", () => {
    const { error } = userSchema.validate(
      { ...goodUser, email: "not-an-email" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "email"),
    ).toBeDefined();
  });

  it("4. The user schema requires a password.", () => {
    const { error } = userSchema.validate(
      { name: "Bob", email: "bob@sample.com" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "password"),
    ).toBeDefined();
  });

  it("5. The user schema requires name.", () => {
    const { error } = userSchema.validate(
      { email: "bob@sample.com", password: "Pa$$word20" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "name"),
    ).toBeDefined();
  });

  it("6. The name must be valid (3 to 30 characters).", () => {
    // "Al" is too short. (The 31 character case is rejected the same way.)
    const { error } = userSchema.validate(
      { ...goodUser, name: "Al" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "name"),
    ).toBeDefined();
  });

  it("7. If validation is performed on a valid user object, error comes back falsy.", () => {
    const { error } = userSchema.validate(goodUser, { abortEarly: false });
    expect(error).toBeFalsy();
  });
});

describe("task object validation tests", () => {
  it("8. The task schema requires a title.", () => {
    const { error } = taskSchema.validate(
      { isCompleted: false },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "title"),
    ).toBeDefined();
  });

  it("9. If an isCompleted value is specified, it must be valid.", () => {
    const { error } = taskSchema.validate(
      { title: "Buy milk", isCompleted: "maybe" },
      { abortEarly: false },
    );
    expect(
      error.details.find((detail) => detail.context.key == "isCompleted"),
    ).toBeDefined();
  });

  it("10. If an isCompleted value is not specified but the rest of the object is valid, a default of false is provided by validation.", () => {
    const { value } = taskSchema.validate(
      { title: "Buy milk" },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBe(false);
  });

  it("11. If isCompleted in the provided object has the value true, it remains true after validation.", () => {
    const { value } = taskSchema.validate(
      { title: "Buy milk", isCompleted: true },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBe(true);
  });
});

describe("patchTask object validation tests", () => {
  it("12. The patchTaskSchema does not require a title.", () => {
    const { error } = patchTaskSchema.validate(
      { isCompleted: true },
      { abortEarly: false },
    );
    expect(error).toBeFalsy();
  });

  it("13. If no value is provided for isCompleted this remains undefined in the returned value.", () => {
    const { value } = patchTaskSchema.validate(
      { title: "New title" },
      { abortEarly: false },
    );
    expect(value.isCompleted).toBeUndefined();
  });
});
