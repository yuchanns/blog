---
title: ltask 笔记
date: 2024-02-15
author: Hanchin Hsieh
avatar: https://avatars.githubusercontent.com/u/25029451
twitter: '@_yuchanns_'
---

ltask 笔记

[ltask](https://github.com/cloudwu/ltask) 是一个用 Lua C API 编写的 lua 异步协程运行时

目前主要被用于 ejoy 的 [ant](https://github.com/ejoy/ant) 游戏引擎，集合了很多方面的使用

我比较感兴趣的是在网络方面对 ltask 的应用。虽然 [wiki](https://github.com/ejoy/ant/wiki/Network#%E7%BD%91%E7%BB%9C%E8%BF%9E%E6%8E%A5) 中表示

> 高效处理网络连接不是 Ant 引擎的设计重点。

但是 Ant 引擎实现了一个简单的 WebServer 向我们揭示了用法

# Ant 中的 WebServer 应用

通过源码阅读我发现 WebServer 主要包含以及存在这样的依赖关系

```Plain&#x20;Text
ant/pkg/ant.webserver -> ant/pkg/ant.net -> bee.lua/{lua_select, lua_socket}
```

其中 ltask 主要参与了 `ant.webserver` 和 `ant.net` 部分的运行时工作

就像许多其他语言对网络服务端的处理一样, 在 webserver 包中 ltask 起一个服务的流程简单说也是

> 创建一个监听给定地址的文件描述符 listen\_fd ，然后在协程中循环等待 accept 这个 listen\_fd 获取请求的 fd
> 接着通过 `ltask.fork` 创建一个协程来处理这个请求

```lua
local listen_fd = assert(net.listen(addr, port))
ltask.fork(function()
  while true do
    local fd = net.accept(listen_fd)
    print("Accept", fd)
    if fd then
    ltask.fork(function()
      -- 处理请求
    end)
  end
end)
```



首先 net 包封装了[ bee.lua](https://github.com/actboy168/bee.lua) 的使用细节，包括:

* `listen` API 

  * 使用 `bee.socket` 创建一个 tcp 协议的 **socket **文件描述符 

  - 指定 `reuseaddr` 并通过 **socket** 的 `bind`方法绑定到给定的 addr 和 port 中

  * 然后使用 **socket** 的 `listen`方法进行监听，并为这个 **socket** 分配一个全局 id 以一个 *obj* 表的形式保存到 *listen\_fds* 表中

  - 接着使用事件循环(这里是 `bee.select` )注册一个读事件 (*\<u>SELECT\_READ\</u>*)  回调

  * 在事件唤醒后的回调中调用 **socket** 的 `accept` 方法，将拿到的 newfd 追加插入到 *obj* 中，并通过 `ltask.wakeup` 方法唤醒协程

  - *这里有一个我一开始无法理解的点就是 **`obj.co`** 是从哪里来的，为什么要唤醒，后面发现和接下来要说的 **`accept`** API 有关*

  * 将全局 id 返回，也就是上面创建流程中的 listen\_fd

  ```lua
  function api.listen(addr, port)
  	local fd, err = socket "tcp"
  	if not fd then
  		return false, err
  	end
  	fd:option("reuseaddr", 1)
  	local ok, err = fd:bind(addr, port)
  	if not ok then
  		fd:close()
  		return false, err
  	end
  	local ok, err = fd:listen()
  	if not ok then
  		fd:close()
  		return false, err
  	end
  	local obj = {
  		fd = fd
  	}
  	local id = fd_id; fd_id = fd_id + 1
  	listen_fds[id] = obj
  	local function accept_fd()
  		local newfd, err = fd:accept()
  		if not newfd then
  			selector:event_del(fd)
  			fd:close()
  			table.insert(obj, err)
  		else
  			table.insert(obj, newfd)
  			if obj.co then
  				wakeup(obj.co)
  				obj.co = nil
  			end
  		end
  	end
  	selector:event_add(fd, SELECT_READ, accept_fd)
  	return id
  end
  ```

- `accept` API

  * 前面我们已经知道这个 API 是在协程循环中调用

  - 它做的事情其实相当单纯，就是把自己所在的协程附加到 `listen` API 创建的 listen\_fd 对应 *listen\_fds* 的 *obj* 上，然后使用 `ltask.wait`挂起让出 cpu

  * 等 `listen` API 中注册的读事件回调时，回调函数中的 `ltask.wakeup`唤醒的就是 `accept` 被中断的协程

  - 被唤醒后它通过 *obj* 取出回调事件插入的 newfd ，然后将 newfd 分配全局 id 和保存到 listen\_fds 中，并事件循环中注册一个触发事件，根据事件类型唤醒相应的读(rd)和写(wt)协程。最后将全局 id 返回

  * *也就是说，accept 并不实际调用 ****socket**** 的 accept 方法，它只是将自身协程挂起暂停，等待事件循环通过 ltask 唤醒后继续向下执行*

  ```lua
  local function new_fd(fd)
  	local id = fd_id; fd_id = fd_id + 1
  	local obj = {
  		fd = fd,
  		flag = 0,
  		update = nil,
  	}
  	function obj.update(event)
  		if event & SELECT_READ then
  			wakeup(obj.rd)
  			obj.rd = nil
  		elseif event & SELECT_WRITE then
  			wakeup(obj.wt)
  			obj.wt = nil
  		end

  		obj.flag = obj.flag & ~event
  		selector:event_mod(obj.fd, obj.flag)
  	end
  	selector:event_add(fd, 0, obj.update)
  	fds[id] = obj
  	return id
  end

  local function get_fd(obj)
  	local fd = table.remove(obj, 1)
  	if type(fd) == "string" then
  		return false, fd
  	end
  	return new_fd(fd)
  end
  ```

* `recv` API

  * 尝试读取，没有就绪则注册一个读事件

  - 然后同样用 `ltask.wait`将自身协程挂起，等待 `accept` 中注册的触发事件唤醒

  * 不同的地方在于数据的读取确实是在该 API 被唤醒后的执行流程中进行的

  - 将读取的内容返回

  ```lua
  function api.recv(fd)
  	local obj = assert(fds[fd])
  	local content, err = obj.fd:recv()
  	if content == false then
  		-- block
  		assert(obj.rd == nil)
  		obj.rd = coroutine.running()
  		add_event(obj, SELECT_READ)
  		local rd = obj.rd
  		ltask.wait(rd)
  		content, err = obj.fd:recv()
  	end
  	return content, err
  end

  local function add_event(obj, flag)
  	obj.flag = obj.flag | flag
  	selector:event_mod(obj.fd, obj.flag)
  end
  ```

- `send` API

  * 检查连接是否被关闭

  - 尝试写入，没有就绪则注册一个写事件

  * 然后同样用 `ltask`将自身协程挂起，等待 `accept` 中注册的触发事件唤醒

  - 数据的写入也在该 API 被唤醒后进行

  * 返回截断后的内容

  ```lua
  local function send(fd, content)
  	local obj = fds[fd]
  	if not obj then
  		return nil, "Closed"
  	end
  	local n, err = obj.fd:send(content)
  	if n == false then
  		-- block
  		assert(obj.wt == nil)
  		obj.wt = coroutine.running()
  		add_event(obj, SELECT_WRITE)
  		ltask.wait(obj.wt)
  		n, err = obj.fd.send(content)
  	end
  	if not n then
  		if n == false then
  			n = 0
  		else
  			return nil, err
  		end
  	end
  	return content:sub(n+1)
  end

  function api.send(fd, content)
  	local err
  	repeat
  		content, err = send(fd, content)
  	until not content or content == ""
  	return err
  end
  ```

* 其余略过不提(...`connect`, `close`)

当然 ant 并不是直接调用 net 的 API 而实际上是通过 io 服务进行的操作(可在 `ant.net/main.lua`[ ](ant.net/main.lua)确认)，不过这并不是我目前关心的

那么为什么说 ant 没有设计高效处理网络的功能呢？经过进一步的深究，我们可以发现最底层所依赖的事件循环 `bee.select` 的[实现](https://github.com/actboy168/bee.lua/blob/4bf175a9f7c3b218049c547b70b17fe1a7e21dbd/binding/lua_select.cpp#L154-L215)只是一个简单的 `select poll` (对外暴露 `wait`, `close`, `event_{add, mod, del}`)

```cpp
static int wait(lua_State* L) {
    auto& ctx         = lua::checkudata<select_ctx>(L, 1);
    lua_Number timeo  = luaL_optnumber(L, 2, -1);
    if (ctx.readset.empty() && ctx.writeset.empty()) {
        if (timeo < 0) {
            return luaL_error(L, "no open sockets to check and no timeout set");
        }
        else {
            thread_sleep(static_cast<int>(timeo * 1000));
            lua_getiuservalue(L, 1, 4);
            return 1;
        }
    }
    struct timeval timeout, *timeop = &timeout;
    if (timeo < 0) {
        timeop = NULL;
    }
    else {
        timeout.tv_sec  = (long)timeo;
        timeout.tv_usec = (long)((timeo - timeout.tv_sec) * 1000000);
    }
    ctx.i     = 1;
    ctx.maxfd = 0;
    FD_ZERO(&ctx.readfds);
    for (auto fd : ctx.readset) {
        FD_SET(fd, &ctx.readfds);
        ctx.maxfd = std::max(ctx.maxfd, fd);
    }
    FD_ZERO(&ctx.writefds);
    for (auto fd : ctx.writeset) {
        FD_SET(fd, &ctx.writefds);
        ctx.maxfd = std::max(ctx.maxfd, fd);
    }
    int ok;
    if (timeop == NULL) {
        do
            ok = ::select(ctx.maxfd + 1, &ctx.readfds, &ctx.writefds, NULL, NULL);
        while (ok == -1 && errno == EINTR);
    }
    else {
        ok = ::select(ctx.maxfd + 1, &ctx.readfds, &ctx.writefds, NULL, timeop);
        if (ok == -1 && errno == EINTR) {
            ok = 0;
        }
    }
    if (ok < 0) {
        push_neterror(L, "select");
        return lua_error(L);
    }
    lua_getiuservalue(L, 1, 3);
    return 1;
}
```

其中并没有使用常见的 **epoll/kqeue** 等高性能事件循环，因此要直接用作处理海量请求的 webserver 还有欠缺

但是我们可以先简单写一个 demo 玩具体验一下具体的使用

## 阶段性总结

这里简单绘制一张图表明 ltask 和 bee.{select, socket} 的协作关系

这将有助于接下来写一个独立的 demo 玩具

# ltask 的调度流程

## 简易 demo

由于仓库本身说明极少，我只能自己摸索出一个使用 ltask 的最小 demo 

怎么得出这个最小 demo 的过程我就懒得赘述了，总之就是通过不断删除代码测试出来的

```lua
--- main.lua
local ltask = require("ltask")
local boot = require("ltask.bootstrap")

local service_path = "./?.lua"
boot.init({})

local SERVICE_ROOT  = 1
local MESSSAGE_SYSTEM  = 0

boot.new_service("root", "@" .. package.searchpath("service", service_path), SERVICE_ROOT)

local init_msg, sz = ltask.pack("init", {
  name = "root",
})
boot.post_message({
  from = SERVICE_ROOT,
  to = SERVICE_ROOT,
  session = 0, -- 0 for root init
  type = MESSSAGE_SYSTEM,
  message = init_msg,
  size = sz,
})
print("ltask Start")
boot.run()

--- service.lua
local i = 0
while true do
  print("service" .. i)
  i = i + 1
  coroutine.yield()
  if i > 5 then
    return
  end
end
```

该 demo 在执行 `lua main.lua`命令后打印如下

```shellscript
ltask Start
service0
service1
service2
service3
service4
service5
```

假如你将 `boot.post_message` 这一部分代码注释掉会发现 demo 卡住

于是我对它的调度原理感到十分好奇，下面尝试分析源码总结出它的调度流程

## 调度流程解析

在上面的 demo 中，除开初始化相关的代码，最核心的动作其实就只有三行

```lua
boot.new_service(...)
boot.post_message(...)
boot.run()
```

对此我们可以结合 ltask 仓库的 c 源码研究这三个方法做了什么事情

通过全局搜索可以找到这三个方法在 c 源码中具有如下对应

```cpp
luaL_Reg l[] = {
        // ...
	{ "run", ltask_run },
	{ "post_message", lpost_message },
	{ "new_service", ltask_newservice },
        // ...
};
```

### ltask\_newservice

创建一个新的服务，根据仓库的描述

> **Each lua service (an indepentent lua VM)** works in request/response mode, they use message channels to inter-communicate.

可知该方法就是创建一个 lua 虚拟机

下面我们具体看方法体的实现

```cpp
static int
ltask_newservice(lua_State *L) {
        struct ltask *task = (struct ltask *)get_ptr(L, "LTASK_GLOBAL");
        const char *label = luaL_checkstring(L, 1);
        const char *filename_source = luaL_checkstring(L, 2);
        unsigned int sid = luaL_optinteger(L, 3, 0);
        service_id id = service_new(task->services, sid);
        newservice(L, task, id, label, filename_source, NULL);
        lua_pushinteger(L, id.id);
        return 1;
}
```

其中 `service_new` 的功能是为新的服务分配内存空间和绑定通讯地址(即 id)，这个阶段服务状态还是未初始化状态(***SERVICE\_STATUS\_UNINITIALIZED***)

其中 id 为 1 的是特殊的根服务

然后使用 `newservice` 对服务进行初始化，实现如下

```cpp
static void
newservice(lua_State *L, struct ltask *task, service_id id, const char *label, const char *filename_source, struct preload_thread *preinit) {
        struct service_ud ud;
        ud.task = task;
        ud.id = id;
        struct service_pool *S = task->services;
        struct service *preS = NULL;
        if (preinit) {
        	atomic_int_store(&preinit->term, 1);
        	thread_wait(preinit->thread);
        	preS = preinit->service;
        	free(preinit);
        }
        
        if (service_init(S, id, (void *)&ud, sizeof(ud), L, preS) || service_requiref(S, id, "ltask", luaopen_ltask, L)) {
        	service_delete(S, id);
        	luaL_error(L, "New service fail : %s", get_error_message(L));
        	return;
        }
        if (service_setlabel(task->services, id, label)) {
        	service_delete(S, id);
        	luaL_error(L, "set label fail");
        	return;
        }
        if (filename_source) {
        	const char * err = NULL;
        	if (filename_source[0] == '@') {
        		err = service_loadfile(S, id, filename_source+1);
        	} else {
        		err = service_loadstring(S, id, filename_source);
        	}
        	if (err) {
        		lua_pushstring(L, err);
        		service_delete(S, id);
        		lua_error(L);
        	}
        }
}
```

大体逻辑是初始化服务，然后将传入的 lua 代码文件(filename\_source)加载到服务的虚拟机上

* 其中方法 `service_init` 用于**创建新的虚拟机实例**

- 加载代码文件的方法 `service_loadfile` 和 `service_loadstring` 将服务状态设置为空闲状态(***SERVICE\_STATUS\_IDLE***)

至此，服务的创建告一段落

### lpost\_message

最初我认为初始化服务完成后应该直接跳到 `ltask_run` 阅读具体的调度逻辑，结果发现如果没有对空闲状态的服务发送消息，调度器不会调度该服务，其实可以从仓库的描述中窥见端倪

> Each lua service (an indepentent lua VM) **works in request/response mode**, they use message channels to inter-communicate.

```cpp
static int
lpost_message(lua_State *L) {
        luaL_checktype(L, 1, LUA_TTABLE);
        struct message msg;
        msg.from.id = checkfield(L, 1, "from");
        msg.to.id = checkfield(L, 1, "to");
        msg.session = (session_t)checkfield(L, 1, "session");
        msg.type = checkfield(L, 1, "type");
        int t = lua_getfield(L, 1, "message");
        if (t == LUA_TNIL) {
                msg.msg = NULL;
                msg.sz = 0;
        } else {
                if (t != LUA_TLIGHTUSERDATA) {
                        return luaL_error(L, ".message should be a pointer");
                }
                msg.msg = lua_touserdata(L, -1);
                lua_pop(L, 1);
                msg.sz = checkfield(L, 1, "size");
        }
        struct ltask *task = (struct ltask *)get_ptr(L, "LTASK_GLOBAL");
        struct message * m = message_new(&msg);
        if (service_push_message(task->services, msg.to, m)) {
                message_delete(m);
                return luaL_error(L, "push message failed");
        }
        check_message_to(task, msg.to);
        return 0;
}
```

该方法首先对消息的格式进行校验，然后装填到一个 `message` 结构中，使用 `service_push_message` 将消息追加到对应服务实例的消息队列中，后续 lua 服务代码可以通过 `recv_message` API 获取到该消息

我们重点看 `check_message_to` 这个方法

```cpp
static void
check_message_to(struct ltask *task, service_id to) {
        struct service_pool *P = task->services;
        int status = service_status_get(P, to);
        if (status == SERVICE_STATUS_IDLE) {
                debug_printf(task->logger, "Service %x is in schedule", to.id);
                service_status_set(P, to, SERVICE_STATUS_SCHEDULE);
                schedule_back(task, to);
        } else if (status == SERVICE_STATUS_EXCLUSIVE) {
                debug_printf(task->logger, "Message to exclusive service %d", to.id);
                int ethread = service_thread_id(task->services, to);
                struct exclusive_thread *thr = get_exclusive_thread(task, ethread);
                assert(thr);
                sockevent_trigger(&thr->event);
        }
}
```

这里我们只关注非独占的普通服务，即处于空闲状态的服务，它会被转变成调度状态(***SERVICE\_STATUS\_SCHEDULE***)，然后通过 `schedule_back` 方法将服务推到 ltask 的调度队列中

```cpp
static inline void
schedule_back(struct ltask *task, service_id id) {
        int r = queue_push_int(task->schedule, (int)id.id);
        // Must succ because task->schedule is large enough.
        assert(r == 0);
}
```

这里就解释了为什么不对服务发送消息不会触发调度，因为只有发送消息才会调用 `schedule_back` 将服务加入到调度队列中

### ltask\_run

从这里开始，调度器将会进入工作状态。该方法按照配置实例化了多个线程，分别负责独占服务和普通服务的工作，并挂起等待线程执行完成或者信号打断从而终止

这里比较有趣的一个设计就是任何线程都可以承担调度器的工作，前提是抢夺到调度权

在这些线程中，我们主要关心负责普通服务的方法 `thread_worker`

```cpp
static int
ltask_run(lua_State *L) {
        int logthread = 0;
        struct ltask *task = (struct ltask *)get_ptr(L, "LTASK_GLOBAL");
        int ecount = exclusive_count(task);
        int threads_count = task->config->worker + ecount + logthread;
        
        struct thread * t = (struct thread *)lua_newuserdatauv(L, threads_count * sizeof(struct thread), 0);
        int i;
        for (i=0;i<ecount;i++) {
        	t[i].func = thread_exclusive;
        	t[i].ud = (void *)&task->exclusives[i];
        }
        for (i=0;i<task->config->worker;i++) {
        	t[ecount + i].func = thread_worker;
        	t[ecount + i].ud = (void *)&task->workers[i];
        }
        atomic_int_store(&task->thread_count, threads_count-logthread);
        if (logthread) {
        	t[threads_count-1].func = thread_logger;
        	t[threads_count-1].ud = (void *)task;
        }
        sig_init();
        thread_join(t, threads_count);
        if (!logthread) {
        	close_logger(task);
        }
        logqueue_delete(task->lqueue);
        return 0;
}
```

该方法实现较长，是一个循环，总体分为两个分支。

```cpp
static void
thread_worker(void *ud) {
        struct worker_thread * w = (struct worker_thread *)ud;
        struct service_pool * P = w->task->services;
        worker_timelog_init(w);
        atomic_int_inc(&w->task->active_worker);
        thread_setnamef("ltask!worker-%02d", w->worker_id);
        int thread_id = THREAD_WORKER(w->worker_id);
        
        sig_register(crash_log_worker, w);
        
        for (;;) {
        	if (w->term_signal) {
        		// quit
        		break;
        	}
        	service_id id = worker_get_job(w);
        	if (id.id) {
        		// 第一个分支，获取到就绪的服务
        	} else {
        		// 第二个分支，未获取到就绪的服务
            		int nojob = 1;
            		if (!acquire_scheduler(w)) {
            			nojob = schedule_dispatch_worker(w);
            			release_scheduler(w);
            		}
            		if (nojob) {
            			// go to sleep
            			atomic_int_dec(&w->task->active_worker);
            			debug_printf(w->logger, "Sleeping (%d)", atomic_int_load(&w->task->active_worker));
            			worker_timelog(w, -1);
            			worker_sleep(w);
            			worker_timelog(w, -1);
            			atomic_int_inc(&w->task->active_worker);
            			debug_printf(w->logger, "Wakeup");
            		}
            	}
        }
        worker_quit(w);
        atomic_int_dec(&w->task->thread_count);
        debug_printf(w->logger, "Quit");
}
```

线程首先通过 `worker_get_job` 检查自己的 `service_ready` slot 是否包含就绪的服务，由于刚开始工作，线程上当然是找不到就绪的服务，于是它会走第二个分支。

**第二个分支**是通过 `acquire_scheduler` 尝试获取调度权。获取调度权的过程是一个 CAS(**CompareAndSwap**)，即指令级别的原子交换行为，可以确保只有始终只有一个线程可以抢夺到调度权

在成功获取到调度权后，线程通过 `schedule_dispatch` (其中的第三部分逻辑)读取调度队列里的服务(注意这里呼应了前面提到的只有对服务发送了消息，服务才会被推入调度队列中的设计)，并通过 `worker_assign_job` 将服务分配到线程的 `service_ready`slot 上。

* 如果无法分配到任何线程上，则重新放入调度队列

- 如果没有任何服务，则终止分配行为

* 如果服务较少，可能存在部分线程没有被分配到服务

- 被分配到服务的线程会被标记为唤醒

最终的效果是尽量实现服务:线程的1:1分配。

```cpp
static int
schedule_dispatch_worker(struct worker_thread *worker) {
        schedule_dispatch(worker->task);
        if (!worker_has_job(worker)) {
                service_id job = steal_job(worker);
                if (job.id) {
                        debug_printf(worker->logger, "Steal service %x", job.id);
                        worker_assign_job(worker, job);
                } else {
                        return 1;
                }
        }
        return 0;
}

static int
schedule_dispatch(struct ltask *task) {
        // Step 3: Assign task to workers
        
        int assign_job = 0;
        
        int job = 0;
        for (i=0;i<task->config->worker;i++) {
        	if (job == 0) {
        		job = queue_pop_int(task->schedule);
        		if (job == 0) {
        			// No job in the queue
        			break;
        		}
        	}
        	service_id id = { job };
        	if (!worker_assign_job(&task->workers[i], id)) {
        		debug_printf(task->logger, "Assign %x to worker %d", id.id, i);
        		worker_wakeup(&task->workers[i]);
        		++assign_job;
        		job = 0;
        	}
        }
        if (job != 0) {
        	// Push unassigned job back
        	queue_push_int(task->schedule, job);
        } else {
        	wakeup_sleeping_workers(task, assign_job);
        }
        return assign_job;
}

static inline int
worker_assign_job(struct worker_thread *worker, service_id id) {
        if (atomic_int_load(&worker->service_ready) == 0) {
                // only one producer (Woker) except itself (worker_steal_job), so don't need use CAS to set
                atomic_int_store(&worker->service_ready, id.id);
                return 0;
        } else {
                // Already has a job
                return 1;
        }
}
```

接着线程再次检查自己是否被分配到了服务，如果没有，则通过 `steal_job` 窃取其他线程 slot 上未被处理的服务。窃取的过程也是一个 CAS

无论当前线程最终是否成功为自己分配到服务，都会将调度权释放

如果没有分配到服务，线程被标记为睡眠

进入下一轮循环，这一次线程检查到自己的 `service_ready` slot 中包含就绪的服务，进入第一个分支

**第一个分支**首先检查服务的状态是否为调度状态，并将其标记为运行状态(***SERVICE\_STATUS\_RUNNING***)，然后使用  `service_resume` 方法恢复服务中的 lua 代码的执行流程(假如我们在服务代码中使用了 `coroutine.yield` 让出 cpu)

```cpp
static void
thread_worker(void *ud) {
        struct worker_thread * w = (struct worker_thread *)ud;
        struct service_pool * P = w->task->services;
        worker_timelog_init(w);
        atomic_int_inc(&w->task->active_worker);
        thread_setnamef("ltask!worker-%02d", w->worker_id);
        int thread_id = THREAD_WORKER(w->worker_id);
        
        sig_register(crash_log_worker, w);
        
        for (;;) {
        	if (w->term_signal) {
        		// quit
        		break;
        	}
        	service_id id = worker_get_job(w);
        	if (id.id) {
                        // 第一个分支
        		w->running = id;
        		int status = service_status_get(P, id);
        		if (status != SERVICE_STATUS_DEAD) {
        			assert(status == SERVICE_STATUS_SCHEDULE);
        			debug_printf(w->logger, "Run service %x", id.id);
        			service_status_set(P, id, SERVICE_STATUS_RUNNING);
        			worker_timelog(w, id.id);
        			if (service_resume(P, id, thread_id)) {
        				worker_timelog(w, id.id);
        				debug_printf(w->logger, "Service %x quit", id.id);
        				service_status_set(P, id, SERVICE_STATUS_DEAD);
        				if (id.id == SERVICE_ID_ROOT) {
        					debug_printf(w->logger, "Root quit");
        					// root quit, wakeup others
        					quit_all_workers(w->task);
        					quit_all_exclusives(w->task);
        					wakeup_all_workers(w->task);
        					break;
        				} else {
        					service_send_signal(P, id);
        				}
        			} else {
        				worker_timelog(w, id.id);
        				service_status_set(P, id, SERVICE_STATUS_DONE);
        			}
        		} else {
        			debug_printf(w->logger, "Service %x is dead", id.id);
        		}
        
        		while (worker_complete_job(w)) {
        			// Can't complete (running -> done)
        			if (!acquire_scheduler(w)) {
        				if (worker_complete_job(w)) {
        					// Do it self
        					schedule_dispatch(w->task);
        					while (worker_complete_job(w)) {}	// CAS may fail spuriously
        				}
        				schedule_dispatch_worker(w);
        				release_scheduler(w);
        				break;
        			}
        		}
        	} else {
                        // 第二个分支
        	}
        }
        worker_quit(w);
        atomic_int_dec(&w->task->thread_count);
        debug_printf(w->logger, "Quit");
}

int
service_resume(struct service_pool *p, service_id id, int thread_id) {
        struct service *S= get_service(p, id);
        if (S == NULL)
                return 1;
        S->thread_id = thread_id;
        lua_State *L = S->L;
        if (L == NULL)
                return 1;
        int nresults = 0;
        uint64_t start = systime_thread();
        S->clock = start;
        int r = lua_resume(L, NULL, 0, &nresults);
        uint64_t end = systime_thread();
        S->cpucost += end - start;
        if (r == LUA_YIELD) {
                lua_pop(L, nresults);
                return 0;
        }
        if (r == LUA_OK) {
                return 1;
        }
        if (!lua_checkstack(L, LUA_MINSTACK)) {
                lua_writestringerror("%s\n", lua_tostring(L, -1));
                lua_pop(L, 1);
                return 1;
        }
        lua_pushfstring(L, "Service %d error: %s", id.id, lua_tostring(L, -1));
        luaL_traceback(L, L, lua_tostring(L, -1), 0);
        lua_writestringerror("%s\n", lua_tostring(L, -1));
        lua_pop(L, 3);
        return 1;
}
```

`service_resume` 实际上是通过 `lua_resume` 方法唤醒服务中的 lua 虚拟机执行，并通过返回值来判断执行结果是服务执行结束还是协程再次主动让出 cpu

如果服务执行结果是协程让出，则标记为执行完成，并由 `schedule_dispatch` 方法的第一部分逻辑收集服务完成的信息，第二部分逻辑决定服务状态标记为空闲或者调度(如果接收到消息)

```cpp
static int
schedule_dispatch(struct ltask *task) {
        // Step 1 : Collect service_done
        int done_job_n = 0;
        service_id done_job[MAX_WORKER];
        int i;
        for (i=0;i<task->config->worker;i++) {
        	service_id job = worker_done_job(&task->workers[i]);
        	if (job.id) {
        		debug_printf(task->logger, "Service %x is done", job.id);
        		done_job[done_job_n++] = job;
        	}
        }
        
        // Step 2: Dispatch out message by service_done
        
        struct service_pool *P = task->services;
        
        for (i=0;i<done_job_n;i++) {
        	service_id id = done_job[i];
        	int status = service_status_get(P, id);
        	if (status == SERVICE_STATUS_DEAD) {
        		struct message *msg = service_message_out(P, id);
        		assert(msg && msg->to.id == SERVICE_ID_ROOT && msg->type == MESSAGE_SIGNAL);
        		switch (service_push_message(P, msg->to, msg)) {
        		case 0 :
        			// succ
        			debug_printf(task->logger, "Signal %x dead to root", id.id);
        			check_message_to(task, msg->to);
        			break;
        		case 1 :
        			debug_printf(task->logger, "Root service is blocked, Service %x tries to signal it later", id.id);
        			schedule_back(task, id);
        			break;
        		default:
        			debug_printf(task->logger, "Root service is missing");
        			service_delete(P, id);
        			break;
        		}
        	} else {
        		struct message *msg = service_message_out(P, id);
        		if (msg) {
        			dispatch_out_message(task, id, msg);
        		}
        		assert(status == SERVICE_STATUS_DONE);
        		if (!service_has_message(P, id)) {
        			debug_printf(task->logger, "Service %x is idle", id.id);
        			service_status_set(P, id, SERVICE_STATUS_IDLE);
        		} else {
        			debug_printf(task->logger, "Service %x back to schedule", id.id);
        			service_status_set(P, id, SERVICE_STATUS_SCHEDULE);
        			schedule_back(task, id);
        		}
        	}
        }
}
```

如果服务的执行结果是执行结束，这里有一个特别的判断

* 当服务的通讯地址是 1 也就是根服务时，所有线程(包括独占线程)都会被标记为终止和唤醒，等到线程再次执行时就会退出

- 如果是其他服务，则会发送一个消息给根服务。并等到 `schedule_dispatch` 方法的第二部分逻辑收集和发送此消息

## 阶段性总结

通过上面的调度流程，我们可以得出 ltask 的运行特点

* 消息驱动调度

- 调度能力模块化，多线程竞争调度权

* 空闲线程窃取繁忙线程提高处理效率

- 根服务决定运行时存活状态



# 实现一个基于 epoll 的 lua 事件循环

由于个人对 Rust 的偏好，我决定使用 [mlua](https://github.com/mlua-rs/mlua) + [mio](https://github.com/tokio-rs/mio) 实现一个基于高性能实现的事件循环模块

## mlua 用法一览

## mio 用法一览

## lio 诞生
