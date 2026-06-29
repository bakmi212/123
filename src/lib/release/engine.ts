import { logStep } from "./logger";
import { PublishOptions } from "./types";

export async function publishRelease(
  options: PublishOptions
) {

  logStep("Start");

  logStep("Sync Repository");

  // syncRepository()

  logStep("Create Release");

  // createRelease()

  logStep("Upload Assets");

  // uploadAssets()

  logStep("Generate Manifest");

  // createManifest()

  logStep("Upload Manifest");

  logStep("Update latest.json");

  logStep("Webhook");

  logStep("Save Updates");

  logStep("Finish");

  return {
    success: true,
  };

}
