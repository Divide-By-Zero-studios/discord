import nacl from 'tweetnacl';

function isHex(value, bytes) {
  return (
    typeof value === 'string' &&
    value.length === bytes * 2 &&
    /^[0-9a-fA-F]+$/.test(value)
  );
}

export function verifyDiscordSignature({ body, signature, timestamp, publicKey }) {
  if (!isHex(signature, 64) || !isHex(publicKey, 32) || typeof timestamp !== 'string') {
    return false;
  }

  return nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );
}
