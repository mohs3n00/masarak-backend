import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isEgyptianNationalId', async: false })
export class IsEgyptianNationalIdConstraint
  implements ValidatorConstraintInterface
{
  validate(nationalId: unknown) {
    if (typeof nationalId !== 'string') return false;

    // Must be exactly 14 digits
    if (!/^\d{14}$/.test(nationalId)) return false;

    // Validate the Century
    const century = parseInt(nationalId.charAt(0));
    if (century < 2 || century > 3) return false; // 2 for 1900-1999, 3 for 2000-2099

    // Validate the Date (YYMMDD)
    const year = parseInt(nationalId.substring(1, 3));
    const month = parseInt(nationalId.substring(3, 5));
    const day = parseInt(nationalId.substring(5, 7));

    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false; // Basic check

    const fullYear = (century === 2 ? 1900 : 2000) + year;
    const dob = new Date(fullYear, month - 1, day);

    // Check if the date is actually valid (e.g., handles Feb 29 leap years correctly)
    if (
      dob.getFullYear() !== fullYear ||
      dob.getMonth() !== month - 1 ||
      dob.getDate() !== day
    ) {
      return false;
    }

    // Validate governorate code (positions 8-9)
    const govCode = parseInt(nationalId.substring(7, 9));
    const validGovCodes = [
      1, 2, 3, 4, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26,
      27, 28, 29, 31, 32, 33, 34, 35, 88,
    ];
    if (!validGovCodes.includes(govCode)) return false;

    // We can also validate the checksum (the 14th digit), but different sources use slightly different weights.
    // For now, this structural validation is robust enough for most cases.
    return true;
  }

  defaultMessage() {
    return 'National ID must be a valid 14-digit Egyptian National ID';
  }
}

export function IsEgyptianNationalId(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEgyptianNationalIdConstraint,
    });
  };
}

/**
 * Extracts information from a valid Egyptian National ID
 */
export function extractNationalIdInfo(nationalId: string) {
  if (!/^\d{14}$/.test(nationalId)) {
    throw new Error('Invalid National ID format');
  }

  const century = parseInt(nationalId.charAt(0));
  const year = parseInt(nationalId.substring(1, 3));
  const month = parseInt(nationalId.substring(3, 5));
  const day = parseInt(nationalId.substring(5, 7));

  const fullYear = (century === 2 ? 1900 : 2000) + year;
  const dateOfBirth = new Date(fullYear, month - 1, day);

  // Gender is determined by the 13th digit (odd = MALE, even = FEMALE)
  const genderDigit = parseInt(nationalId.charAt(12));
  const gender = genderDigit % 2 === 1 ? 'MALE' : 'FEMALE';

  return { dateOfBirth, gender };
}
