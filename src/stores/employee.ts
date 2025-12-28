import { defineStore } from "pinia";

export type Employee = {
  id: string;
  name: string;
  previewUrlAvatar: string;
};

export type EmployeePlacementMap = {
  employeeId: string;
  placementId: string;
};

const mockEmployeers = [
  {
    id: "123",
    name: "Vasya",
    previewUrlAvatar:
      "https://avataaars.io/?avatarStyle=Circle&topType=LongHairStraight&accessoriesType=Wayfarers&hairColor=BlondeGolden&facialHairType=BeardMedium&facialHairColor=Red&clotheType=ShirtScoopNeck&clotheColor=Black&eyeType=WinkWacky&eyebrowType=RaisedExcited&mouthType=Serious&skinColor=Pale",
  },

  {
    id: "456",
    name: "Маша",
    previewUrlAvatar:
      "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairShortRound&accessoriesType=Prescription02&hairColor=Blonde&facialHairType=BeardLight&facialHairColor=BlondeGolden&clotheType=ShirtCrewNeck&clotheColor=PastelBlue&eyeType=Squint&eyebrowType=Angry&mouthType=Twinkle&skinColor=Yellow",
  },

  {
    id: "145",
    name: "Петя",
    previewUrlAvatar:
      "https://avataaars.io/?avatarStyle=Circle&topType=ShortHairTheCaesar&accessoriesType=Sunglasses&hairColor=Platinum&facialHairType=BeardMedium&facialHairColor=Auburn&clotheType=BlazerSweater&eyeType=Cry&eyebrowType=UpDownNatural&mouthType=ScreamOpen&skinColor=Black'",
  },
];

const mockMaps: EmployeePlacementMap[] = [
  {
    employeeId: "123",
    placementId: "1",
  },
  {
    employeeId: "456",
    placementId: "3",
  },
  {
    employeeId: "145",
    placementId: "11",
  },
];

export const useEmployeeStore = defineStore("employee", {
  state: () => {
    return {
      employees: mockEmployeers as Employee[],
      employeePlacementMaps: mockMaps as EmployeePlacementMap[],
    };
  },
  getters: {
    /**
     * Получает сотрудника по ID
     */
    getEmployeeById: (state) => {
      return (id: string): Employee | undefined => {
        return state.employees.find((emp) => emp.id === id);
      };
    },
    /**
     * Получает размещение сотрудника по ID сотрудника
     */
    getPlacementByEmployeeId: (state) => {
      return (employeeId: string): string | undefined => {
        const map = state.employeePlacementMaps.find(
          (m) => m.employeeId === employeeId
        );
        return map?.placementId;
      };
    },
    /**
     * Получает сотрудника по ID размещения
     */
    getEmployeeByPlacementId: (state) => {
      return (placementId: string): Employee | undefined => {
        const map = state.employeePlacementMaps.find(
          (m) => m.placementId === placementId
        );
        if (!map) return undefined;
        return state.employees.find((emp) => emp.id === map.employeeId);
      };
    },
    /**
     * Получает все размещения сотрудника
     */
    getPlacementsByEmployeeId: (state) => {
      return (employeeId: string): string[] => {
        return state.employeePlacementMaps
          .filter((m) => m.employeeId === employeeId)
          .map((m) => m.placementId);
      };
    },
  },
});
