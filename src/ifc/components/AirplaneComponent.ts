import * as THREE from "three";
import * as OBC from "@thatopen/components";
import { v4 } from "uuid";

/**
 * Компонент для отображения самолетика из примитивов в сцене Open Components
 */
export class AirplaneComponent extends OBC.Component
    implements OBC.Disposable, OBC.Updateable {
    readonly uuid: string;

    readonly onAfterUpdate = new OBC.Event();
    readonly onBeforeUpdate = new OBC.Event();
    readonly onDisposed = new OBC.Event();

    enabled = true;

    // Группа самолетика
    airplane: THREE.Group;

    // Параметры полета по кругу
    private angle = 0; // Текущий угол на круге
    private radius = 15; // Радиус круга
    private centerY = 10; // Высота центра круга
    private speed = 0.5; // Скорость полета (радиан в секунду)

    // Примитивы самолетика
    private fuselage: THREE.Mesh; // Фюзеляж
    private leftWing: THREE.Mesh; // Левое крыло
    private rightWing: THREE.Mesh; // Правое крыло
    private tail: THREE.Mesh; // Хвост
    private propeller: THREE.Mesh; // Пропеллер
    private nose: THREE.Mesh; // Нос

    // Материалы
    private bodyMaterial: THREE.MeshStandardMaterial;
    private wingMaterial: THREE.MeshStandardMaterial;

    constructor(components: OBC.Components) {
        super(components);
        // Генерируем уникальный UUID для каждого экземпляра
        this.uuid = v4();
        components.add(this.uuid, this);

        // Создаем материалы
        this.bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x4a90e2, // Синий цвет для фюзеляжа
            metalness: 0.7,
            roughness: 0.3
        });

        this.wingMaterial = new THREE.MeshStandardMaterial({
            color: 0x2c5aa0, // Темно-синий для крыльев
            metalness: 0.5,
            roughness: 0.4
        });

        // Создаем группу самолетика
        this.airplane = new THREE.Group();
        this.airplane.name = "Airplane";

        // Фюзеляж (цилиндр)
        const fuselageGeometry = new THREE.CylinderGeometry(0.3, 0.3, 2, 16);
        this.fuselage = new THREE.Mesh(fuselageGeometry, this.bodyMaterial);
        this.fuselage.rotation.z = Math.PI / 2; // Поворачиваем горизонтально
        this.airplane.add(this.fuselage);

        // Нос (конус)
        const noseGeometry = new THREE.ConeGeometry(0.3, 0.8, 16);
        this.nose = new THREE.Mesh(noseGeometry, this.bodyMaterial);
        this.nose.position.set(1.4, 0, 0);
        this.nose.rotation.z = Math.PI / 2;
        this.airplane.add(this.nose);

        // Левое крыло (бокс)
        const wingGeometry = new THREE.BoxGeometry(1.5, 0.1, 0.5);
        this.leftWing = new THREE.Mesh(wingGeometry, this.wingMaterial);
        this.leftWing.position.set(0, 0, -0.3);
        this.airplane.add(this.leftWing);

        // Правое крыло (бокс)
        this.rightWing = new THREE.Mesh(wingGeometry, this.wingMaterial);
        this.rightWing.position.set(0, 0, 0.3);
        this.airplane.add(this.rightWing);

        // Хвост (бокс)
        const tailGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.4);
        this.tail = new THREE.Mesh(tailGeometry, this.wingMaterial);
        this.tail.position.set(-1, 0.3, 0);
        this.airplane.add(this.tail);

        // Пропеллер (цилиндр)
        const propellerGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
        this.propeller = new THREE.Mesh(propellerGeometry, new THREE.MeshStandardMaterial({
            color: 0x888888,
            metalness: 0.8,
            roughness: 0.2
        }));
        this.propeller.position.set(1.6, 0, 0);
        this.propeller.rotation.z = Math.PI / 2;
        this.airplane.add(this.propeller);

        // Устанавливаем начальную позицию
        this.airplane.position.set(this.radius, this.centerY, 0);
    }

    /**
     * Добавляет самолетик в сцену
     * @param world - мир Open Components, в который нужно добавить самолетик
     */
    addToScene(world: OBC.SimpleWorld<OBC.SimpleScene, any, any>) {
        if (world?.scene?.three) {
            world.scene.three.add(this.airplane);
            console.log("Самолетик добавлен в сцену");
        }
    }

    /**
     * Удаляет самолетик из сцены
     * @param world - мир Open Components
     */
    removeFromScene(world: OBC.SimpleWorld<OBC.SimpleScene, any, any>) {
        if (world?.scene?.three) {
            world.scene.three.remove(this.airplane);
            console.log("Самолетик удален из сцены");
        }
    }

    /**
     * Устанавливает параметры полета по кругу
     * @param radius - радиус круга
     * @param centerY - высота центра круга
     * @param speed - скорость полета (радиан в секунду)
     */
    setFlightParams(radius: number, centerY: number, speed: number) {
        this.radius = radius;
        this.centerY = centerY;
        this.speed = speed;
    }

    /**
     * Устанавливает начальный угол для полета
     * @param initialAngle - начальный угол в радианах
     */
    setInitialAngle(initialAngle: number) {
        this.angle = initialAngle;
    }

    /**
     * Геттеры для доступа к свойствам
     */
    getRadius(): number {
        return this.radius;
    }

    getCenterY(): number {
        return this.centerY;
    }

    getSpeed(): number {
        return this.speed;
    }

    getAngle(): number {
        return this.angle;
    }

    getPosition(): THREE.Vector3 {
        return this.airplane.position.clone();
    }

    getRotation(): THREE.Euler {
        return this.airplane.rotation.clone();
    }

    async update(delta?: number) {
        if (!this.enabled) return;

        this.onBeforeUpdate.trigger();

        // Обновляем угол для движения по кругу
        // delta обычно в миллисекундах, конвертируем в секунды
        const deltaSeconds = delta ? delta / 1000 : 0.016; // По умолчанию ~60 FPS
        this.angle += this.speed * deltaSeconds;

        // Вычисляем позицию на круге
        const x = Math.cos(this.angle) * this.radius;
        const z = Math.sin(this.angle) * this.radius;
        const y = this.centerY + Math.sin(this.angle * 2) * 2; // Небольшие вертикальные колебания

        // Обновляем позицию самолетика
        this.airplane.position.set(x, y, z);

        // Поворачиваем самолетик в направлении движения
        const targetRotation = Math.atan2(z, x) + Math.PI / 2;
        this.airplane.rotation.y = targetRotation;

        // Наклоняем самолетик при повороте (banking)
        const bankingAngle = Math.sin(this.angle * 2) * 0.3;
        this.airplane.rotation.z = bankingAngle;

        // Вращаем пропеллер
        this.propeller.rotation.x += deltaSeconds * 50; // Быстрое вращение

        this.onAfterUpdate.trigger();
    }

    dispose() {
        this.enabled = false;

        // Очищаем события
        this.onBeforeUpdate.reset();
        this.onAfterUpdate.reset();

        // Используем Disposer для правильной очистки Three.js объектов
        // Disposer автоматически очистит все геометрии и материалы внутри группы
        const disposer = this.components.get(OBC.Disposer);
        if (disposer) {
            disposer.destroy(this.airplane);
        }

        // Очищаем материалы вручную (если они не были очищены Disposer)
        this.bodyMaterial.dispose();
        this.wingMaterial.dispose();

        this.onDisposed.trigger();
        this.onDisposed.reset();
    }
}