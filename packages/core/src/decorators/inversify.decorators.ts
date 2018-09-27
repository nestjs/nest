import {
  postConstruct,
  targetName,
  unmanaged,
  decorate,
  optional,
  tagged,
  named,
} from 'inversify';

// Doesn't mark the font color as blue for functions
// in the import statements when using the below
// export const Injectable = injectable;

// Export them like this for convenience sake
export const Optional = optional;
export const PostConstruct = postConstruct;
export const TargetName = targetName;
export const Unmanaged = unmanaged;
export const Decorate = decorate;
export const Tagged = tagged;
export const Named = named;
