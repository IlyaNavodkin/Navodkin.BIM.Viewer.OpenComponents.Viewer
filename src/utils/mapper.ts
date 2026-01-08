import * as OBC from "@thatopen/components";

/**
 * Преобразует modelId и массив localIds в ModelIdMap
 */
export const toModelIdMap = (
  modelId: string,
  localIds: number[]
): OBC.ModelIdMap => {
  return {
    [modelId]: new Set(localIds),
  };
};

