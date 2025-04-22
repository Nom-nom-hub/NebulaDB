/**
 * A simple mutex implementation for concurrency control
 */
export class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];
  
  /**
   * Acquire the mutex
   */
  async acquire(): Promise<() => void> {
    const release = () => {
      this.locked = false;
      
      if (this.queue.length > 0) {
        const next = this.queue.shift()!;
        next();
      }
    };
    
    if (!this.locked) {
      this.locked = true;
      return release;
    }
    
    return new Promise<() => void>(resolve => {
      this.queue.push(() => {
        this.locked = true;
        resolve(release);
      });
    });
  }
  
  /**
   * Execute a function with the mutex
   */
  async withLock<T>(fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire();
    
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

/**
 * A read-write lock implementation for concurrency control
 */
export class ReadWriteLock {
  private readers = 0;
  private writer = false;
  private writeQueue: Array<() => void> = [];
  private readQueue: Array<() => void> = [];
  
  /**
   * Acquire a read lock
   */
  async acquireRead(): Promise<() => void> {
    if (!this.writer && this.writeQueue.length === 0) {
      this.readers++;
      return () => this.releaseRead();
    }
    
    return new Promise<() => void>(resolve => {
      this.readQueue.push(() => {
        this.readers++;
        resolve(() => this.releaseRead());
      });
    });
  }
  
  /**
   * Release a read lock
   */
  private releaseRead(): void {
    this.readers--;
    
    if (this.readers === 0 && this.writeQueue.length > 0) {
      const writer = this.writeQueue.shift()!;
      writer();
    }
  }
  
  /**
   * Acquire a write lock
   */
  async acquireWrite(): Promise<() => void> {
    if (!this.writer && this.readers === 0) {
      this.writer = true;
      return () => this.releaseWrite();
    }
    
    return new Promise<() => void>(resolve => {
      this.writeQueue.push(() => {
        this.writer = true;
        resolve(() => this.releaseWrite());
      });
    });
  }
  
  /**
   * Release a write lock
   */
  private releaseWrite(): void {
    this.writer = false;
    
    if (this.writeQueue.length > 0) {
      const writer = this.writeQueue.shift()!;
      writer();
    } else if (this.readQueue.length > 0) {
      const readers = [...this.readQueue];
      this.readQueue = [];
      
      for (const reader of readers) {
        reader();
      }
    }
  }
  
  /**
   * Execute a function with a read lock
   */
  async withReadLock<T>(fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquireRead();
    
    try {
      return await fn();
    } finally {
      release();
    }
  }
  
  /**
   * Execute a function with a write lock
   */
  async withWriteLock<T>(fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquireWrite();
    
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

/**
 * A semaphore implementation for limiting concurrent operations
 */
export class Semaphore {
  private permits: number;
  private queue: Array<() => void> = [];
  
  constructor(permits: number) {
    this.permits = permits;
  }
  
  /**
   * Acquire a permit
   */
  async acquire(): Promise<() => void> {
    if (this.permits > 0) {
      this.permits--;
      return () => this.release();
    }
    
    return new Promise<() => void>(resolve => {
      this.queue.push(() => {
        resolve(() => this.release());
      });
    });
  }
  
  /**
   * Release a permit
   */
  private release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    } else {
      this.permits++;
    }
  }
  
  /**
   * Execute a function with a permit
   */
  async withPermit<T>(fn: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire();
    
    try {
      return await fn();
    } finally {
      release();
    }
  }
}

/**
 * A task queue for executing tasks in parallel
 */
export class TaskQueue {
  private semaphore: Semaphore;
  private running = false;
  private tasks: Array<() => Promise<void>> = [];
  
  constructor(concurrency: number = 4) {
    this.semaphore = new Semaphore(concurrency);
  }
  
  /**
   * Add a task to the queue
   */
  async add<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.tasks.push(async () => {
        try {
          const result = await this.semaphore.withPermit(task);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.running) {
        this.run();
      }
    });
  }
  
  /**
   * Run tasks in the queue
   */
  private async run(): Promise<void> {
    if (this.running) return;
    
    this.running = true;
    
    while (this.tasks.length > 0) {
      const task = this.tasks.shift()!;
      task(); // Don't await, let it run in parallel
    }
    
    this.running = false;
  }
}
