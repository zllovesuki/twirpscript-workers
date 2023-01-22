import { TwirpError } from "twirpscript";
import { Context } from "../context";
import { Haberdasher, createHaberdasher } from "../../proto/hat.pb";

function choose<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const haberdasher: Haberdasher<Context> = {
  MakeHat: (size, ctx) => {
    return {
      inches: size.inches,
      color: choose(["red", "green", "blue", "purple"]),
      name: choose(["beanie", "fedora", "top hat", "cowboy", "beret"]),
    };
  },
  HatError: async (size, ctx) => {
    await sleep(500);
    throw new TwirpError({
      code: "unimplemented",
      msg: "not a hat",
    });
  },
};

export const haberdasherHandler = createHaberdasher(haberdasher);
