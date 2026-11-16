import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  assertCanChangeRole,
  assertCanRemove,
  MemberFact,
  requireMember,
  requireOwner,
} from './membership';

const members: MemberFact[] = [
  { userId: 'rafi', name: 'Rafi', role: 'OWNER', active: true },
  { userId: 'nusrat', name: 'Nusrat', role: 'MEMBER', active: true },
  { userId: 'arif', name: 'Arif', role: 'MEMBER', active: true },
  { userId: 'tania', name: 'Tania', role: 'MEMBER', active: false }, // left
];
const settled = () => 0;

describe('membership rules', () => {
  it('hides the group from non-members and people who left (404)', () => {
    expect(() => requireMember(members, 'stranger')).toThrow(NotFoundException);
    expect(() => requireMember(members, 'tania')).toThrow(NotFoundException);
    expect(requireMember(members, 'nusrat').name).toBe('Nusrat');
  });

  it('only owners do owner things (403)', () => {
    expect(() => requireOwner(members, 'nusrat', 'rename the group')).toThrow(
      new ForbiddenException('Only group owners can rename the group'),
    );
    expect(requireOwner(members, 'rafi', 'x').role).toBe('OWNER');
  });

  describe('roles', () => {
    it('lets an owner promote a member', () => {
      expect(
        assertCanChangeRole(members, 'rafi', 'nusrat', 'OWNER').userId,
      ).toBe('nusrat');
    });

    it('never leaves a group without an owner', () => {
      expect(() =>
        assertCanChangeRole(members, 'rafi', 'rafi', 'MEMBER'),
      ).toThrow(ConflictException);
    });

    it('refuses members and unknown targets', () => {
      expect(() =>
        assertCanChangeRole(members, 'nusrat', 'arif', 'OWNER'),
      ).toThrow(ForbiddenException);
      expect(() =>
        assertCanChangeRole(members, 'rafi', 'tania', 'OWNER'),
      ).toThrow(NotFoundException);
    });
  });

  describe('leaving and removing', () => {
    it('lets a settled member leave, and an owner remove a settled member', () => {
      expect(assertCanRemove(members, 'nusrat', 'nusrat', settled).name).toBe(
        'Nusrat',
      );
      expect(assertCanRemove(members, 'rafi', 'arif', settled).name).toBe(
        'Arif',
      );
    });

    it('refuses anyone who still owes or is owed money', () => {
      expect(() =>
        assertCanRemove(members, 'rafi', 'arif', () => -45050),
      ).toThrow('Arif still owes ৳450.50 in this group. Settle up first.');
      expect(() =>
        assertCanRemove(members, 'nusrat', 'nusrat', () => 120000),
      ).toThrow('You are still owed ৳1,200 in this group. Settle up first.');
    });

    it('stops members removing others, and owners removing owners', () => {
      expect(() => assertCanRemove(members, 'nusrat', 'arif', settled)).toThrow(
        ForbiddenException,
      );
      const twoOwners = members.map((m) =>
        m.userId === 'arif' ? { ...m, role: 'OWNER' as const } : m,
      );
      expect(() => assertCanRemove(twoOwners, 'rafi', 'arif', settled)).toThrow(
        'Arif is an owner. Make them a member first, then remove them.',
      );
    });

    it('stops the only owner leaving while others remain', () => {
      expect(() => assertCanRemove(members, 'rafi', 'rafi', settled)).toThrow(
        "You're the only owner. Make someone else an owner before you leave.",
      );
      const alone = members.filter((m) => m.userId === 'rafi');
      expect(assertCanRemove(alone, 'rafi', 'rafi', settled).userId).toBe(
        'rafi',
      );
    });
  });
});
