import { Haberdasher, createHaberdasher } from "../../proto/hat.pb";

function choose<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

const haberdasher: Haberdasher = {
  MakeHat: (size) => {
    return {
      inches: size.inches,
      color: choose(["red", "green", "blue", "purple"]),
      name: choose(["beanie", "fedora", "top hat", "cowboy", "beret"]),
    };
  },
};

export const haberdasherHandler = createHaberdasher(haberdasher);
