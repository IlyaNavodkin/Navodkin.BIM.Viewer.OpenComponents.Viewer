import * as THREE from "three";
import * as OBC from "@thatopen/components";

export class HelloWorldComponent
  extends OBC.Component
  implements OBC.Disposable, OBC.Updateable
{
  static readonly uuid = "0f89b34b-fc6b-4b97-b56d-1edeb0a308a2" as const;

  readonly onAfterUpdate = new OBC.Event<void>();
  readonly onBeforeUpdate = new OBC.Event<void>();
  readonly onDisposed = new OBC.Event<void>();

  enabled = true;

  private readonly _message = "Hello";
  private _mesh: THREE.Mesh;
  private _meshes: THREE.Mesh[] = [];

  constructor(components: OBC.Components) {
    super(components);
    components.add(HelloWorldComponent.uuid, this);

    this._mesh = new THREE.Mesh();
    this._meshes.push(this._mesh);
  }

  get mesh(): THREE.Mesh {
    if (!this._mesh) {
      throw new Error("Mesh not initialized!");
    }
    return this._mesh;
  }

  greet(name: string): void {
    const message = `${this._message} ${name}!`;
    console.log(message);
  }

  dispose(): void {
    this.enabled = false;

    this.onBeforeUpdate.reset();
    this.onAfterUpdate.reset();

    const disposer = this.components.get(OBC.Disposer);

    for (const mesh of this._meshes) {
      disposer.destroy(mesh);
    }

    this._meshes = [];
    this._mesh = null as unknown as THREE.Mesh;

    this.onDisposed.trigger();
    this.onDisposed.reset();
  }

  async update(delta?: number): Promise<void> {
    if (!this.enabled) return;

    this.onBeforeUpdate.trigger();
    console.log("Updated! Delta: " + delta);
    this.onAfterUpdate.trigger();
  }
}
