import { ref } from "vue";
import { defineStore } from "pinia";

export type Employee = {
  id: string;
  name: string;
  avatarUrl: string;
  workplaceNumber: string | null; // null означает, что сотрудник не назначен на место
};

export const useEmployeeStore = defineStore("employee", () => {
  const employees = ref<Employee[]>([
    {
      id: "emp-001",
      name: "Иванов Иван Иванович",
      avatarUrl: "https://i.pravatar.cc/150?img=12",
      workplaceNumber: "1",
    },
    {
      id: "emp-002",
      name: "Петрова Мария Сергеевна",
      avatarUrl: "https://i.pravatar.cc/150?img=5",
      workplaceNumber: "3",
    },
    {
      id: "emp-003",
      name: "Сидоров Алексей Петрович",
      avatarUrl: "https://i.pravatar.cc/150?img=33",
      workplaceNumber: "WP-005",
    },
    {
      id: "emp-004",
      name: "Козлова Елена Владимировна",
      avatarUrl: "https://i.pravatar.cc/150?img=9",
      workplaceNumber: "2",
    },
    {
      id: "emp-005",
      name: "Морозов Дмитрий Александрович",
      avatarUrl: "https://i.pravatar.cc/150?img=52",
      workplaceNumber: "WP-002",
    },
    {
      id: "emp-006",
      name: "Новикова Анна Игоревна",
      avatarUrl: "https://i.pravatar.cc/150?img=10",
      workplaceNumber: "4",
    },
    {
      id: "emp-007",
      name: "Волков Сергей Николаевич",
      avatarUrl: "https://i.pravatar.cc/150?img=68",
      workplaceNumber: null, // Свободное место
    },
    {
      id: "emp-008",
      name: "Соколова Ольга Дмитриевна",
      avatarUrl: "https://i.pravatar.cc/150?img=20",
      workplaceNumber: "7",
    },
    {
      id: "emp-009",
      name: "Лебедев Максим Викторович",
      avatarUrl: "https://i.pravatar.cc/150?img=15",
      workplaceNumber: "WP-006",
    },
    {
      id: "emp-010",
      name: "Павлова Татьяна Андреевна",
      avatarUrl: "https://i.pravatar.cc/150?img=23",
      workplaceNumber: null, // Свободное место
    },
  ]);

  const getEmployeeByWorkplaceNumber = (workplaceNumber: string) => {
    return employees.value.find(
      (emp) => emp.workplaceNumber === workplaceNumber
    );
  };

  return {
    employees,
    getEmployeeByWorkplaceNumber,
  };
});
