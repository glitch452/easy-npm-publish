import type { InputOptions, Workflow } from 'src/types/Workflow.js';

export class WorkflowMock implements Workflow {
  protected lookup: Record<string, string> = {};
  requestedInputs: Set<string> = new Set();

  constructor() {
    this.reset();
  }

  reset(setDefaultValues: boolean = false) {
    this.requestedInputs = new Set();
    this.lookup = setDefaultValues ? { 'registry-token': '<registryToken>', 'github-token': '<githubToken>' } : {};
  }

  setInputValue(key: string, value: string) {
    this.lookup[key] = value;
  }

  clearInputValue(key: string) {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- For testing purposes
    delete this.lookup[key];
  }

  setInputValues(values: Record<string, string>) {
    this.lookup = { ...this.lookup, ...values };
  }

  getInput(name: string, options?: InputOptions) {
    const value = this.lookup[name] ?? '';
    this.requestedInputs.add(name);
    if (options?.required && !value) {
      throw new Error(`Value Required for ${name}`);
    }
    return value;
  }

  getBooleanInput(name: string, options?: InputOptions) {
    return ['true', 'True', 'TRUE'].includes(this.getInput(name, options));
  }

  getMultilineInput(name: string, options?: InputOptions) {
    return this.getInput(name, options).split(/\r?\n/);
  }

  setOutput(_name: string, _value: unknown) {}

  setFailed(_message: string | Error) {}
}
