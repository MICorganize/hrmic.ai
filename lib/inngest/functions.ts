import { inngest } from "./client";

/**
 * Example durable function. Trigger it by sending the event from anywhere:
 *
 *   await inngest.send({ name: "app/example.triggered", data: { id: "..." } });
 */
export const exampleFunction = inngest.createFunction(
  { id: "app/example", triggers: { event: "app/example.triggered" } },
  async ({ event, step }) => {
    const id = event.data.id as string;

    const processed = await step.run("process", async () => {
      // Replace with real work (email, AI call, report generation, ...).
      return { processed: true, id };
    });

    return { message: `Processed ${id}`, ...processed };
  }
);
