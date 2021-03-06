import * as _ from "underscore";
import 'reflect-metadata';

export type Newable<T> = {new() : T}

export interface IRepositoryCache<T> {
  [key: string]: T
}

export class Repository<T>{
  protected cache: IRepositoryCache<T> = {}
  add(key: string, item: T){
    this.cache[key] = item;
  }

  get(key: string){
    return this.cache[key];
  }

  exists(key: string){
    return !!this.cache[key];
  }

  getAll(){
    return _.values(this.cache);
  }

  keys(){
    return _.keys(this.cache);
  }
}

export class DecoratorRepository<T> extends Repository<T>{
}

export interface IPropertyMetadata {
  propertyName: string;
}

function mergeArrayProperties<T>(master:T, child:T) {
  _.each(_.keys(master), k => {
    const value = master[k]
    const childValue = child[k]
    if (_.isArray(value) || _.isArray(childValue)) {
      master[k] = _.flatten([value,childValue])
    }
  })
}
export class DecoratorStore<T> {
  constructor(private metadataKey: string, private repository = new DecoratorRepository<T>()){
  }
  fromClass(key: string, data: (target: Function) => T, postProcess?: (t:T) => void, members?: string[]): ClassDecorator {
    return (target: Function) => {
      const dataItem = data(target);
      if (members && members.length) {
        const items = dataItem["items"] = [] as IPropertyMetadata[]
        members && _.forEach(members, prop => {
          const data = Reflect.getMetadata(this.makePropKey(prop), target.prototype) as IPropertyMetadata[]
          data && _.forEach(data, d => {
            const found = _.find(items, i => i.propertyName === d.propertyName)
            const cleaned = _.omit(d, "propertyName");
            const di = {[prop]: cleaned}
            if (found) {
              const existing = found[prop]
              if (existing) {
                mergeArrayProperties(existing, cleaned)
                return
              }
              _.extend(found, di)
              return
            }
            items.push(_.extend({propertyName: d.propertyName}, di)) //, items[d.propertyName]
          })
        })
      }
      postProcess && postProcess(dataItem)
      this.repository.add(key, dataItem)
      Reflect.defineMetadata(this.metadataKey, key, target);
    }
  }
  private makePropKey(prop: string){
    return `${this.metadataKey}-${prop}`
  }

  getKey(target: Newable<T>): string{
    return Reflect.getMetadata(this.metadataKey, target);
  }

  memberCollect<P>(metadataKey: string, data: (target: Function, methodName: string, type: any, descriptor?: PropertyDescriptor) => P & IPropertyMetadata): PropertyDecorator {
    return (target: any, methodName: string, descriptor?: PropertyDescriptor) => {
      const type = Reflect.getMetadata('design:type', target, methodName)
      this.addArrayItem(this.makePropKey(metadataKey), target, data(target, methodName, type, descriptor))
    }
  }

  private addArrayItem<T>(key: string, target: any, item: T){
    const items: T[] = Reflect.getMetadata(key, target) || []
    items.push(item)
    Reflect.defineMetadata(key, items, target);
  }
}
