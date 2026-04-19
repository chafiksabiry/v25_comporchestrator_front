declare module 'jwt-encode' {
  export default function jwtEncode(payload: object, secret: string): string;
} 
