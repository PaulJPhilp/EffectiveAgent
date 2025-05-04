import type { AgentRecord } from "../types.js"

/**
 * Mock implementation of Dexie for testing
 */
export class MockDexie {
    private data: Map<string, AgentRecord> = new Map()
    private subscribers: Array<(records: AgentRecord[]) => void> = []

    agentRecords = {
        get: async (id: string) => this.data.get(id),
        put: async (record: AgentRecord) => {
            this.data.set(record.id, record)
            this.notifySubscribers()
            return record.id
        },
        bulkPut: async (records: AgentRecord[]) => {
            records.forEach(record => this.data.set(record.id, record))
            this.notifySubscribers()
            return records.map(r => r.id)
        },
        where: (field: string) => ({
            equals: (value: any) => ({
                toArray: async () => Array.from(this.data.values()).filter(r => {
                    const parts = field.split(".")
                    let current: any = r
                    for (const part of parts) {
                        current = current[part]
                    }
                    return current === value
                }),
                delete: async () => {
                    const toDelete = Array.from(this.data.values()).filter(r => {
                        const parts = field.split(".")
                        let current: any = r
                        for (const part of parts) {
                            current = current[part]
                        }
                        return current === value
                    })
                    toDelete.forEach(r => this.data.delete(r.id))
                    this.notifySubscribers()
                    return toDelete.length
                },
                count: async () => {
                    const records = Array.from(this.data.values()).filter(r => {
                        const parts = field.split(".")
                        let current: any = r
                        for (const part of parts) {
                            current = current[part]
                        }
                        return current === value
                    })
                    return records.length
                },
                filter: (predicate: (r: AgentRecord) => boolean) => ({
                    toArray: async () => Array.from(this.data.values())
                        .filter(r => {
                            const parts = field.split(".")
                            let current: any = r
                            for (const part of parts) {
                                current = current[part]
                            }
                            return current === value && predicate(r)
                        }),
                    count: async () => Array.from(this.data.values())
                        .filter(r => {
                            const parts = field.split(".")
                            let current: any = r
                            for (const part of parts) {
                                current = current[part]
                            }
                            return current === value && predicate(r)
                        }).length,
                    limit: (n: number) => ({
                        toArray: async () => Array.from(this.data.values())
                            .filter(r => {
                                const parts = field.split(".")
                                let current: any = r
                                for (const part of parts) {
                                    current = current[part]
                                }
                                return current === value && predicate(r)
                            })
                            .slice(0, n)
                    })
                }),
                limit: (n: number) => ({
                    toArray: async () => Array.from(this.data.values())
                        .filter(r => {
                            const parts = field.split(".")
                            let current: any = r
                            for (const part of parts) {
                                current = current[part]
                            }
                            return current === value
                        })
                        .slice(0, n)
                })
            })
        }),
        orderBy: (field: string) => ({
            uniqueKeys: async () => {
                const values = new Set<string>()
                Array.from(this.data.values()).forEach(r => {
                    const parts = field.split(".")
                    let current: any = r
                    for (const part of parts) {
                        current = current[part]
                    }
                    values.add(current)
                })
                return Array.from(values)
            }
        }),
        update: async (id: string, changes: Record<string, any>) => {
            const record = this.data.get(id)
            if (!record) return 0
            const updated = { ...record }
            Object.entries(changes).forEach(([key, value]) => {
                const parts = key.split(".")
                let current: any = updated
                for (let i = 0; i < parts.length - 1; i++) {
                    current = current[parts[i]]
                }
                current[parts[parts.length - 1]] = value
            })
            this.data.set(id, updated as AgentRecord)
            this.notifySubscribers()
            return 1
        },
        delete: async (id: string) => {
            const existed = this.data.delete(id)
            this.notifySubscribers()
            return existed ? 1 : 0
        }
    }

    transaction<T>(mode: string, table: any, callback: () => Promise<T>): Promise<T> {
        return callback()
    }

    version(n: number): { stores: () => MockDexie } {
        return {
            stores: () => this
        }
    }

    private notifySubscribers() {
        const records = Array.from(this.data.values())
        this.subscribers.forEach(subscriber => subscriber(records))
    }

    liveQuery<T>(query: () => Promise<T>) {
        return {
            subscribe: (subscriber: { next: (value: T) => void }) => {
                const wrappedSubscriber = async (records: AgentRecord[]) => {
                    const result = await query()
                    subscriber.next(result)
                }
                this.subscribers.push(wrappedSubscriber)
                query().then(result => subscriber.next(result))
                return {
                    unsubscribe: () => {
                        const index = this.subscribers.indexOf(wrappedSubscriber)
                        if (index > -1) {
                            this.subscribers.splice(index, 1)
                        }
                    }
                }
            }
        }
    }
} 