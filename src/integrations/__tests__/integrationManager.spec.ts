import fs from 'fs';
import os from 'os';
import path from 'path';
import IntegrationManager from '@/integrations/integrationManager';

const resourcesDir = path.join('resources', os.platform(), 'bin');
let testDir: string;
let integrationDir: string;
let dockerCliPluginDir: string;

beforeEach(async() => {
  testDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'rdtest-'));
  integrationDir = path.join(testDir, 'integrationDir');
  dockerCliPluginDir = path.join(testDir, 'dockerCliPluginDir');
});

afterEach(async() => {
  // It is best to be careful around rm's; we don't want to remove important things.
  if (testDir) {
    await fs.promises.rm(testDir, { recursive: true, force: true });
  }
});

test('Ensure symlinks and dirs are created properly', async() => {
  const integrationManager = new IntegrationManager(resourcesDir, integrationDir, dockerCliPluginDir);
  await integrationManager.enforce();
  expect(fs.promises.readdir(integrationDir)).resolves.not.toThrow();
  for (let name of await integrationManager.getIntegrationNames()) {
    const integrationPath = path.join(integrationDir, name);
    expect(fs.promises.readlink(integrationPath, 'utf8')).resolves.not.toThrow();
  }
  for (let name of await integrationManager.getDockerCliPluginNames()) {
    const pluginPath = path.join(dockerCliPluginDir, name);
    expect(fs.promises.readlink(pluginPath, 'utf8')).resolves.not.toThrow();
  }
});

test('Ensure non-legacy symlinks and dirs are removed properly', async() => {
  const integrationManager = new IntegrationManager(resourcesDir, integrationDir, dockerCliPluginDir);
  await integrationManager.enforce();

  await integrationManager.remove();

  expect(fs.promises.readdir(integrationDir)).rejects.toThrow();
  expect(fs.promises.readdir(dockerCliPluginDir)).resolves.toEqual([]);
});

test('Existing docker CLI plugins should not be overwritten upon .enforce()', async() => {
  // create existing plugin
  const existingPluginPath = path.join(dockerCliPluginDir, 'docker-compose');
  const existingPluginContents = 'meaningless contents';
  await fs.promises.mkdir(dockerCliPluginDir, {mode: 0o755});
  await fs.promises.writeFile(existingPluginPath, existingPluginContents);

  const integrationManager = new IntegrationManager(resourcesDir, integrationDir, dockerCliPluginDir);
  await integrationManager.enforce();

  const newContents = await fs.promises.readFile(existingPluginPath, 'utf8');
  expect(newContents).toEqual(existingPluginContents);
});

test('Existing docker CLI plugins should not be removed upon .remove()', async() => {
  // create existing plugin
  const existingPluginPath = path.join(dockerCliPluginDir, 'docker-compose');
  const existingPluginContents = 'meaningless contents';
  await fs.promises.mkdir(dockerCliPluginDir, {mode: 0o755});
  await fs.promises.writeFile(existingPluginPath, existingPluginContents);

  const integrationManager = new IntegrationManager(resourcesDir, integrationDir, dockerCliPluginDir);
  await integrationManager.remove();

  const newContents = await fs.promises.readFile(existingPluginPath, 'utf8');
  expect(newContents).toEqual(existingPluginContents);
});

test('.enforce() should be idempotent', async() => {
  const integrationManager = new IntegrationManager(resourcesDir, integrationDir, dockerCliPluginDir);
  await integrationManager.enforce();
  return integrationManager.enforce();
});

test('.remove() should be idempotent', async() => {
  const integrationManager = new IntegrationManager(resourcesDir, integrationDir, dockerCliPluginDir);
  await integrationManager.remove();
  return integrationManager.remove();
});
