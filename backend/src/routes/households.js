const crypto = require('crypto');
const express = require('express');
const Household = require('../models/Household');
const HouseholdMembership = require('../models/HouseholdMembership');
const User = require('../models/User');

const router = express.Router();
const hash = (value) => crypto.createHash('sha256').update(value).digest('hex');
async function sendInvitation(email, token, householdName) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    if (process.env.NODE_ENV === 'production') throw new Error('Transactional email is not configured');
    return;
  }
  const url = process.env.PUBLIC_APP_URL
    ? `${process.env.PUBLIC_APP_URL.replace(/\/$/, '')}?action=accept-invite&token=${encodeURIComponent(token)}`
    : `dhanam://accept-invite?token=${encodeURIComponent(token)}`;
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [email], subject: `Join ${householdName} on Dhanam`, text: `You were invited to collaborate on ${householdName}. Accept the invitation: ${url}` }) });
  if (!response.ok) throw new Error('Invitation email delivery failed');
}
const publicMembership = (membership) => ({
  id: membership._id, householdId: membership.householdId?._id || membership.householdId,
  householdName: membership.householdId?.name, email: membership.email, role: membership.role,
  status: membership.status, userId: membership.userId, joinedAt: membership.joinedAt,
});

router.get('/', async (req, res) => {
  const rows = await HouseholdMembership.find({ userId: req.user._id, status: 'active' }).populate('householdId').sort({ isDefault: -1, joinedAt: 1 });
  res.json(rows.map(publicMembership));
});

router.post('/', async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (name.length < 2) return res.status(400).json({ error: 'Household name is required' });
  const household = await Household.create({
    name, dataOwnerUserId: req.user._id, createdByUserId: req.user._id,
    currency: req.user.currency || 'AED', locale: req.user.locale || 'en-AE',
  });
  const membership = await HouseholdMembership.create({
    householdId: household._id, userId: req.user._id, email: req.user.email,
    role: 'owner', status: 'active', joinedAt: new Date(),
  });
  res.status(201).json(publicMembership({ ...membership.toObject(), householdId: household }));
});

router.get('/:id/members', async (req, res) => {
  const self = await HouseholdMembership.findOne({ householdId: req.params.id, userId: req.user._id, status: 'active' });
  if (!self) return res.status(403).json({ error: 'Household access required' });
  const rows = await HouseholdMembership.find({ householdId: req.params.id, status: { $ne: 'removed' } }).sort({ createdAt: 1 });
  res.json(rows.map(publicMembership));
});

router.post('/:id/invitations', async (req, res) => {
  const self = await HouseholdMembership.findOne({ householdId: req.params.id, userId: req.user._id, status: 'active', role: { $in: ['owner', 'admin'] } });
  if (!self) return res.status(403).json({ error: 'Household administrator access required' });
  const email = String(req.body.email || '').trim().toLowerCase();
  const role = ['admin', 'contributor'].includes(req.body.role) ? req.body.role : 'contributor';
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address' });
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const knownUser = await User.findOne({ email });
  const household = await Household.findById(req.params.id);
  const membership = await HouseholdMembership.findOneAndUpdate(
    { householdId: req.params.id, email },
    { userId: knownUser?._id || null, role, status: 'invited', invitedByUserId: req.user._id, inviteTokenHash: hash(rawToken), inviteExpiresAt: new Date(Date.now() + 7 * 86400000) },
    { upsert: true, new: true, runValidators: true }
  );
  await sendInvitation(email, rawToken, household.name);
  // Production delivery is handled by the configured transactional email integration.
  res.status(201).json({ ...publicMembership(membership), ...(process.env.NODE_ENV === 'production' ? {} : { inviteToken: rawToken }) });
});

router.post('/invitations/accept', async (req, res) => {
  const tokenHash = hash(String(req.body.token || ''));
  const membership = await HouseholdMembership.findOne({ inviteTokenHash: tokenHash, status: 'invited', inviteExpiresAt: { $gt: new Date() } });
  if (!membership || membership.email !== req.user.email) return res.status(400).json({ error: 'Invitation is invalid, expired, or belongs to another email' });
  membership.userId = req.user._id;
  membership.status = 'active';
  membership.joinedAt = new Date();
  membership.inviteTokenHash = null;
  membership.inviteExpiresAt = null;
  await membership.save();
  await User.updateOne({ _id: req.user._id }, { onboardingCompleted: true, emailVerifiedAt: req.user.emailVerifiedAt || new Date() });
  res.json(publicMembership(membership));
});

router.patch('/:id/members/:membershipId', async (req, res) => {
  const self = await HouseholdMembership.findOne({ householdId: req.params.id, userId: req.user._id, status: 'active', role: 'owner' });
  if (!self) return res.status(403).json({ error: 'Household owner access required' });
  const target = await HouseholdMembership.findOne({ _id: req.params.membershipId, householdId: req.params.id });
  if (!target || target.role === 'owner') return res.status(400).json({ error: 'Owner membership cannot be changed here' });
  if (req.body.status === 'removed') target.status = 'removed';
  if (['admin', 'contributor'].includes(req.body.role)) target.role = req.body.role;
  await target.save();
  res.json(publicMembership(target));
});

router.post('/:id/ownership', async (req, res) => {
  const self = await HouseholdMembership.findOne({ householdId: req.params.id, userId: req.user._id, status: 'active', role: 'owner' });
  const target = await HouseholdMembership.findOne({ _id: req.body.membershipId, householdId: req.params.id, status: 'active', userId: { $ne: null } });
  if (!self || !target || String(self._id) === String(target._id)) return res.status(400).json({ error: 'Choose an active collaborator to receive ownership' });
  target.role = 'owner'; self.role = 'admin';
  await target.save(); await self.save();
  res.json({ message: 'Household ownership transferred' });
});

module.exports = router;
