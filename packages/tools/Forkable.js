export default Decoratee =>
class Forkable extends Decoratee {
  fork (overrides: any) {
    const ret = Object.create(this);
    if (overrides) Object.assign(ret, overrides);
    return ret;
  }
};
