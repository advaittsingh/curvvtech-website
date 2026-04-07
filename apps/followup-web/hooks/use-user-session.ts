export const IS_USER_SIGNED_IN_KEY = 'isUserSignedIn'
export const USER_CONTACT_KEY = 'userContact'
export const ONBOARDING_COMPLETE_KEY = 'onboardingComplete'

export interface UserSessionState {
  isUserSignedIn: boolean
  userContact: string
  onboardingComplete: boolean
}

function asBool(value: string | null) {
  return value === 'true'
}

export function getUserSessionState(): UserSessionState {
  if (typeof window === 'undefined') {
    return {
      isUserSignedIn: false,
      userContact: '',
      onboardingComplete: false,
    }
  }

  return {
    isUserSignedIn: asBool(window.localStorage.getItem(IS_USER_SIGNED_IN_KEY)),
    userContact: window.localStorage.getItem(USER_CONTACT_KEY) || '',
    onboardingComplete: asBool(
      window.localStorage.getItem(ONBOARDING_COMPLETE_KEY),
    ),
  }
}

export function setUserSignedIn(contact: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(IS_USER_SIGNED_IN_KEY, 'true')
  window.localStorage.setItem(USER_CONTACT_KEY, contact)
}

export function setOnboardingComplete(value: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, value ? 'true' : 'false')
}
