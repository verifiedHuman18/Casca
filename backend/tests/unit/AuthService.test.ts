import { UserType } from '@senoom/shared';
import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';
import { Admin } from '../../src/domain/Admin';
import { DomainError } from '../../src/domain/DomainError';
import { assign, clubMember, makeClub } from './factories';
import { fastHasher, makeAuthKit, SECRET, signUpInput } from './authTestKit';

const admin = new Admin({
  userId: 'admin-1',
  name: 'Admin',
  email: 'Admin@Campus.edu',
  passwordHash: 'hashed:admin password',
});

const codeOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return (err as DomainError).code;
  }
  return 'NO_ERROR';
};

describe('AuthService.signUp', () => {
  it('creates a student with no positions and returns a usable token', async () => {
    const { service } = makeAuthKit();
    const { token, user } = await service.signUp(signUpInput);
    expect(user.type).toBe(UserType.STUDENT);
    expect(user.enrollmentNo).toBe('IIT2025257');
    expect(user.assignments).toEqual([]);
    expect(JSON.stringify(user)).not.toContain('hashed');
    expect((await service.authenticate(token)).userId).toBe(user.userId);
  });

  it('rejects a duplicate enrollment number whatever its case', async () => {
    const { service } = makeAuthKit();
    await service.signUp(signUpInput);
    expect(await codeOf(service.signUp({ ...signUpInput, enrollmentNo: 'IIT2025257' }))).toBe(
      'ENROLLMENT_EXISTS'
    );
  });

  it('rejects an unknown section and a weak password', async () => {
    const { service } = makeAuthKit();
    expect(await codeOf(service.signUp({ ...signUpInput, sectionId: 'nope' }))).toBe(
      'SECTION_NOT_FOUND'
    );
    expect(await codeOf(service.signUp({ ...signUpInput, password: 'short' }))).toBe(
      'INVALID_PASSWORD'
    );
  });
});

describe('AuthService.login', () => {
  it('logs a student in by enrollment number, ignoring case', async () => {
    const { service } = makeAuthKit();
    await service.signUp(signUpInput);
    const res = await service.login({ enrollmentNo: 'IIT2025257', password: 'correct horse' });
    expect(res.user.enrollmentNo).toBe('IIT2025257');
  });

  it('logs an admin in by email, ignoring case', async () => {
    const { service } = makeAuthKit([admin]);
    const res = await service.login({ email: 'admin@campus.edu', password: 'admin password' });
    expect(res.user.type).toBe(UserType.ADMIN);
    expect(res.user.enrollmentNo).toBeNull();
  });

  it('gives the same error for a wrong password and an unknown account', async () => {
    const { service } = makeAuthKit();
    await service.signUp(signUpInput);
    const wrong = service.login({ enrollmentNo: 'IIT2025257', password: 'wrong password' });
    const unknown = service.login({ enrollmentNo: 'NOBODY1', password: 'wrong password' });
    const [a, b] = await Promise.allSettled([wrong, unknown]);
    expect(a.status).toBe('rejected');
    expect((a as PromiseRejectedResult).reason).toEqual((b as PromiseRejectedResult).reason);
    expect(((a as PromiseRejectedResult).reason as DomainError).code).toBe('INVALID_CREDENTIALS');
  });

  it('does not let an admin password log in as a student or the reverse', async () => {
    const { service } = makeAuthKit([admin]);
    expect(
      await codeOf(service.login({ enrollmentNo: 'admin@campus.edu', password: 'admin password' }))
    ).toBe('INVALID_CREDENTIALS');
  });
});

describe('AuthService.authenticate', () => {
  it('carries no roles in the token', async () => {
    const { service } = makeAuthKit();
    const { token } = await service.signUp(signUpInput);
    const payload = jwt.decode(token) as Record<string, unknown>;
    expect(Object.keys(payload).sort()).toEqual(['exp', 'iat', 'sub', 'type']);
  });

  it('rejects garbage, a wrong secret, an expired token and alg none', async () => {
    const { service } = makeAuthKit();
    const { user } = await service.signUp(signUpInput);
    const claims = { type: UserType.STUDENT };
    const wrongSecret = jwt.sign(claims, 'x'.repeat(40), { subject: user.userId });
    const expired = jwt.sign(claims, SECRET, { subject: user.userId, expiresIn: -10 });
    const none = [
      Buffer.from('{"alg":"none","typ":"JWT"}').toString('base64url'),
      Buffer.from(JSON.stringify({ sub: user.userId, ...claims })).toString('base64url'),
      '',
    ].join('.');
    for (const bad of ['garbage', wrongSecret, expired, none]) {
      expect(await codeOf(service.authenticate(bad))).toBe('UNAUTHENTICATED');
    }
  });

  it('rejects a token for a removed account', async () => {
    const { service, students } = makeAuthKit();
    const { token, user } = await service.signUp(signUpInput);
    await students.deactivate(user.userId);
    expect(await codeOf(service.authenticate(token))).toBe('UNAUTHENTICATED');
  });

  it('sees a new position and a revoked one on the very next call', async () => {
    const { service, assignments } = makeAuthKit();
    const { token, user } = await service.signUp(signUpInput);
    const club = makeClub('club-1');
    const a = assign(clubMember, { club }, null, user.userId);
    await assignments.add(a);

    const withRole = await service.authenticate(token);
    expect(withRole.assignments).toHaveLength(1);
    expect(withRole.clubIds).toEqual(['club-1']);

    a.end();
    await assignments.updateEndsOn(a);
    const after = await service.authenticate(token);
    expect(after.assignments).toEqual([]);
    expect(after.clubIds).toEqual([]);
  });
});

describe('AuthService.changePassword', () => {
  it('needs the current password, then the new one works for login', async () => {
    const { service } = makeAuthKit();
    const { user } = await service.signUp(signUpInput);
    expect(await codeOf(service.changePassword(user, 'not it', 'brand new pass'))).toBe(
      'WRONG_PASSWORD'
    );
    expect(await codeOf(service.changePassword(user, 'correct horse', 'short'))).toBe(
      'INVALID_PASSWORD'
    );
    await service.changePassword(user, 'correct horse', 'brand new pass');
    await service.login({ enrollmentNo: 'IIT2025257', password: 'brand new pass' });
    expect(
      await codeOf(service.login({ enrollmentNo: 'IIT2025257', password: 'correct horse' }))
    ).toBe('INVALID_CREDENTIALS');
    expect(fastHasher.validate('long enough')).toBeNull();
  });
});
