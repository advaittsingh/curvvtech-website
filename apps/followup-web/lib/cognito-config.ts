export function getCognitoConfig() {
  const region = process.env.COGNITO_REGION?.trim() || ''
  const userPoolId = process.env.COGNITO_USER_POOL_ID?.trim() || ''
  const clientId = process.env.COGNITO_CLIENT_ID?.trim() || ''
  return { region, userPoolId, clientId }
}

export function cognitoIssuer(region: string, userPoolId: string) {
  return `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
}

export function cognitoJwksUrl(region: string, userPoolId: string) {
  return `${cognitoIssuer(region, userPoolId)}/.well-known/jwks.json`
}

export function assertCognitoConfigured() {
  const c = getCognitoConfig()
  if (!c.region || !c.userPoolId || !c.clientId) {
    const err = new Error('COGNITO_NOT_CONFIGURED')
    err.name = 'CognitoNotConfigured'
    throw err
  }
  return c
}
