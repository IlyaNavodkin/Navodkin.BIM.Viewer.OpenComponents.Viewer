export type MockupModelStatus = "ready" | "processing";

export type MockupProperty = {
  id: string;
  name: string;
  dataType: string;
  value: string;
};

export type MockupPropertySet = {
  id: string;
  name: string;
  properties: MockupProperty[];
};

export type MockupTreeNode = {
  id: string;
  modelId: string;
  label: string;
  type: string;
  container: boolean;
  children: MockupTreeNode[];
  propertySets: MockupPropertySet[];
};

export type MockupModel = {
  id: string;
  name: string;
  discipline: string;
  uploadedAt: string;
  status: MockupModelStatus;
};

export type MockupProject = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
};

export type CreateMockupProjectPayload = {
  name: string;
  description: string;
};
