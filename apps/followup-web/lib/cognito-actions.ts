import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { assertCognitoConfigured } from './cognito-config'

function client() {
  const { region } = assertCognitoConfigured()
  return new CognitoIdentityProviderClient({ region })
}

export async function cognitoSignUp(email: string, password: string) {
  const { clientId } = assertCognitoConfigured()
  const username = email.trim().toLowerCase()
  await client().send(
    new SignUpCommand({
      ClientId: clientId,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: 'email', Value: username }],
    })
  )
}

export async function cognitoSignIn(email: string, password: string) {
  const { clientId } = assertCognitoConfigured()
  const username = email.trim().toLowerCase()
  const out = await client().send(
    new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: username,
        PASSWORD: password,
      },
    })
  )
  const ar = out.AuthenticationResult
  if (!ar?.AccessToken || !ar.RefreshToken || !ar.ExpiresIn) {
    throw new Error('Unexpected Cognito response')
  }
  return {
    accessToken: ar.AccessToken,
    refreshToken: ar.RefreshToken,
    expiresIn: ar.ExpiresIn,
    idToken: ar.IdToken,
  }
}

export async function cognitoRefresh(refreshToken: string) {
  const { clientId } = assertCognitoConfigured()
  const out = await client().send(
    new InitiateAuthCommand({
      ClientId: clientId,
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    })
  )
  const ar = out.AuthenticationResult
  if (!ar?.AccessToken || !ar.ExpiresIn) {
    throw new Error('Refresh failed')
  }
  return {
    accessToken: ar.AccessToken,
    expiresIn: ar.ExpiresIn,
    idToken: ar.IdToken,
  }
}
