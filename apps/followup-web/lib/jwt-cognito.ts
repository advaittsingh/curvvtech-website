import { createRemoteJWKSet, jwtVerify } from 'jose'
import { assertCognitoConfigured, cognitoIssuer, cognitoJwksUrl } from './cognito-config'

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  const { region, userPoolId } = assertCognitoConfigured()
  const url = cognitoJwksUrl(region, userPoolId)
  if (!jwks) jwks = createRemoteJWKSet(new URL(url))
  return jwks
}

export async function verifyCognitoJwt(token: string) {
  const { region, userPoolId, clientId } = assertCognitoConfigured()
  const issuer = cognitoIssuer(region, userPoolId)
  const { payload } = await jwtVerify(token, getJwks(), {
    issuer,
    algorithms: ['RS256'],
  })

  const tokenUse = String(payload.token_use || '')
  if (tokenUse && tokenUse !== 'access' && tokenUse !== 'id') {
    throw new Error('Invalid token use')
  }

  if (clientId) {
    const aud = payload.aud
    const cid = payload.client_id
    const ok =
      aud === clientId ||
      cid === clientId ||
      (Array.isArray(aud) && aud.includes(clientId))
    if (!ok && (aud != null || cid != null)) {
      throw new Error('Invalid audience')
    }
  }

  const sub = String(payload.sub || '')
  if (!sub) throw new Error('Missing sub')

  const email =
    typeof payload.email === 'string'
      ? payload.email
      : typeof payload['username'] === 'string'
        ? String(payload['username'])
        : undefined

  return { sub, email }
}
