import { client } from "twirpscript";
import { MakeHat, MakeHatJSON } from "./proto/hat.pb";

client.baseURL = "http://localhost:8787";

(async function () {
  try {
    console.log("Requesting via Protobuf");
    const protoHat = await MakeHat({ inches: 12 });
    console.log(protoHat);

    console.log("Requesting via JSON");
    const jsonHat = await MakeHatJSON({ inches: 6 });
    console.log(jsonHat);
  } catch (e) {
    console.error(e);
  }
})();
