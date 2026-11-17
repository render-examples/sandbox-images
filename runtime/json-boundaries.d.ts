/**
 * JSON text has no application schema. Require a decoder before using its value.
 *
 * The broad reviver parameter is intentional: JSON.parse ignores a non-function
 * reviver at runtime, and accepting every reviver also prevents overload fallback
 * to the standard library's unchecked return type. Callback authors must type
 * their own inputs; passing a callback never proves the resulting JSON shape.
 * This declaration affects checking only and is not shipped into image runtimes.
 */
export {};
declare global {
  interface JSON {
    parse(text: string, reviver?: unknown): unknown;
  }
}
