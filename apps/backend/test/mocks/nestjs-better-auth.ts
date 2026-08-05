/**
 * Jest stub for the ESM-only `@thallesp/nestjs-better-auth` package.
 *
 * The real package (and its `better-auth` dependency) ship ESM only, which the
 * backend's CommonJS ts-jest setup cannot evaluate. The app itself runs fine on
 * Node's native `require(esm)` support — this stub only keeps controller unit
 * tests from pulling the whole ESM graph into the jest module registry. It
 * provides no-op decorators so class metadata still resolves.
 */
type Decorator = (...args: unknown[]) => void;

export const Public = (): Decorator => () => {};
export const Session = (): ParameterDecorator => () => {};
export const OptionalAuth = (): Decorator => () => {};
export const Roles = (): Decorator => () => {};

export type UserSession = {
  session: Record<string, unknown>;
  user: Record<string, unknown>;
};

export class AuthGuard {}
export class AuthService {}

export const AuthModule = {
  forRoot: () => ({ module: class AuthModuleStub {} }),
};
