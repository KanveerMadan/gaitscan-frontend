// Which test a result comes from (backend gaitcore.result: "walk" or "treadmill"; absent = walk).
export const isTreadmill = (result) => result?.test === "treadmill";
