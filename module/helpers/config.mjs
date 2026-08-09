export const XDZ = {};

/**
 * Training stats a Commando distributes 10 points across.
 */
XDZ.trainings = {
  pilot: 'XDZ.Training.Pilot',
  systems: 'XDZ.Training.Systems',
  mechanic: 'XDZ.Training.Mechanic',
  weapons: 'XDZ.Training.Weapons',
  medical: 'XDZ.Training.Medical',
};

XDZ.trainingBudget = 10;
XDZ.statPipMax = 4;

/**
 * Resistance stats a Commando distributes 6 points across.
 */
XDZ.resistances = {
  fear: 'XDZ.Resistance.Fear',
  dodge: 'XDZ.Resistance.Dodge',
  death: 'XDZ.Resistance.Death',
};

XDZ.resistanceBudget = 6;

XDZ.injuryDown = 4;
XDZ.injuryDeath = 6;

XDZ.defaultTarget = 12;

XDZ.xenoModes = {
  hide: 'XDZ.Xeno.Hide',
  seek: 'XDZ.Xeno.Seek',
};

XDZ.destroyDieSteps = ['1d4', '1d6', '1d8', '1d10', '1d12'];

// Placeholder art from Foundry's core icon set — swap for custom XDZ art later.
XDZ.actorTypeImages = {
  commando: 'icons/svg/mystery-man.svg',
  character: 'icons/svg/mystery-man.svg',
  xeno: 'icons/svg/skull.svg',
};

XDZ.itemTypeImages = {
  weapon: 'icons/svg/sword.svg',
  gear: 'icons/svg/chest.svg',
};
