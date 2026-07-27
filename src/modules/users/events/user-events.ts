export class UserCreatedEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
  ) {}
}

export class ProfileUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly changes: any,
  ) {}
}

export class AvatarUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly url: string,
  ) {}
}

export class SettingsChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly type: string,
  ) {}
}

export class EmailChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly newEmail: string,
  ) {}
}

export class PhoneChangedEvent {
  constructor(
    public readonly userId: string,
    public readonly newPhone: string,
  ) {}
}

export class AccountDeletedEvent {
  constructor(
    public readonly userId: string,
    public readonly reason?: string,
  ) {}
}
