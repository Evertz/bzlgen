// generators must be exported from here
export * from './containers/container-layer.generator';
export * from './js/nodejs-binary.generator';
export * from './ng/ng.generator';
export * from './sass/sass.generator';
export * from './ts/ts.generator';

export { GeneratorType } from './types';
export { getGenerator }from './resolve-generator';
