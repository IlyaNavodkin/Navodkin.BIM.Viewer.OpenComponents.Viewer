import * as OBC from "@thatopen/components";

export const toModelIdMap = (
  modelId: string,
  localIds: number[]
): OBC.ModelIdMap => {
  return {
    [modelId]: new Set(localIds),
  };
};

