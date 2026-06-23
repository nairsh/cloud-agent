import { makeFunctionReference, type FunctionReference } from "convex/server";

export function internalMutationRef<Args extends Record<string, any>, Ret>(
  name: string,
) {
  return makeFunctionReference<"mutation", Args, Ret>(name) as unknown as FunctionReference<
    "mutation",
    "internal",
    Args,
    Ret
  >;
}
