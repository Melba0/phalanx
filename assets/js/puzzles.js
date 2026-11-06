/* ==========================================================================
   GitHub 题库（Melba0/phalanxpuzzle）
   读取：未连接时走 raw.githubusercontent.com（公开、无 CORS 凭据）
   写入：浏览器端 GitHub Contents API，Token 只保存在本机 localStorage
   ========================================================================== */
(function (LBQ) {
  'use strict';

  var REPO = {
    owner: 'Melba0',
    repo: 'phalanxpuzzle',
    branch: 'main',
    path: 'puzzles.json'
  };
  var API = 'https://api.github.com';
  var API_REPO = API + '/repos/' + REPO.owner + '/' + REPO.repo;
  var RAW = 'https://raw.githubusercontent.com/' + REPO.owner + '/' + REPO.repo + '/' + REPO.branch + '/' + REPO.path;
  var REPO_URL = 'https://github.com/' + REPO.owner + '/' + REPO.repo;
  var FILE_URL = REPO_URL + '/blob/' + REPO.branch + '/' + REPO.path;
  var TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';
  var AUTH_KEY = 'github';
  var CACHE_KEY = 'puzzleCache';
  var DEFAULT_AUTH = window.PHALANX_DEFAULT_AUTH || null;

  /* ------------------------------------------------------------ 编码 */
  function b64encode(str) {
    var bytes = new TextEncoder().encode(str);
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }
  function b64decode(b64) {
    var bin = atob(String(b64 || '').replace(/\s+/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function hash(str) {
    var h = 5381;
    for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  /* ------------------------------------------------------------ 连接信息 */
  function auth() {
    var a = LBQ.store.get(AUTH_KEY, null);
    if (a && typeof a === 'object' && a.token) return a;
    if (DEFAULT_AUTH && DEFAULT_AUTH.token) return DEFAULT_AUTH;
    return null;
  }
  function token() { var a = auth(); return a ? a.token : ''; }
  function hasToken() { return !!token(); }
  function name() { var a = auth(); return a && a.name ? a.name : ''; }
  function setAuth(a) { LBQ.store.set(AUTH_KEY, a || null); }
  function clearAuth() { LBQ.store.set(AUTH_KEY, null); }

  /* ------------------------------------------------------------ HTTP */
  function ghFetch(url, opts) {
    opts = opts || {};
    var headers = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
    if (opts.auth) headers.Authorization = 'Bearer ' + (opts.token || token());
    var init = { method: opts.method || 'GET', headers: headers, cache: 'no-store' };
    if (opts.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(opts.body);
    }
    return fetch(url, init).then(function (res) {
      return res.text().then(function (text) {
        var data = null;
        try { data = text ? JSON.parse(text) : null; } catch (e) { }
        if (res.ok) return data;
        var err = new Error((data && data.message) || ('GitHub API 错误（HTTP ' + res.status + '）'));
        err.status = res.status;
        err.data = data;
        throw err;
      });
    });
  }

  function contentsUrl() {
    return API_REPO + '/contents/' + REPO.path.split('/').map(encodeURIComponent).join('/') + '?ref=' + encodeURIComponent(REPO.branch);
  }

  /* ------------------------------------------------------------ Token 测试 */
  function testToken(tok) {
    if (!tok) return Promise.resolve({ ok: false, message: '请填写 GitHub Token' });
    return ghFetch(API_REPO, { auth: true, token: tok }).then(function (repo) {
      var push = !!(repo.permissions && repo.permissions.push);
      return ghFetch(API + '/user', { auth: true, token: tok }).then(function (u) {
        return { ok: true, push: push, login: u && u.login, repo: repo.full_name, branch: repo.default_branch || REPO.branch, private: !!repo.private };
      }, function () {
        return { ok: true, push: push, login: '', repo: repo.full_name, branch: repo.default_branch || REPO.branch, private: !!repo.private };
      });
    }, function (err) {
      var msg = err.message;
      if (err.status === 401) msg = 'Token 无效或已过期（GitHub 返回 401）。';
      else if (err.status === 404) msg = 'Token 无权访问 ' + REPO.owner + '/' + REPO.repo + '（GitHub 返回 404）。请确认 Token 的 Repository access 包含该仓库。';
      else if (err.status === 403) msg = 'Token 权限不足或触发限流（GitHub 返回 403）。';
      return { ok: false, status: err.status, message: msg };
    });
  }

  /* ------------------------------------------------------------ 数据规范化 */
  function normSolution(sol) {
    var arr = Array.isArray(sol) ? sol : (typeof sol === 'string' ? sol.split(/\s+/) : []);
    return arr.map(function (s) { return String(s == null ? '' : s).trim().replace(/^\d+\.+/, ''); })
      .filter(function (s) { return !!s && s !== '...' && s !== '…'; });
  }

  function normalize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var code = String(raw.code || '').trim();
    if (!code) return null;
    var sol = normSolution(raw.solution);
    if (!sol.length) return null;
    var dec = LBQ.decodePosition(code);
    if (dec.error) return null;
    // 逐步验证解法；坏题不进入列表
    var g = dec.game.clone();
    for (var i = 0; i < sol.length; i++) {
      var act = g.parseToken(sol[i]);
      if (!act || !act.ok) return null;
      g.apply(act);
    }
    var title = String(raw.title || '').trim() || '未命名题目';
    return {
      id: String(raw.id || '').trim() || ('r' + hash(code + '|' + title)),
      title: title.slice(0, 60),
      code: code,
      solution: sol,
      intro: String(raw.intro || '').slice(0, 200),
      hint: String(raw.hint || '').slice(0, 200),
      author: String(raw.author || '').slice(0, 40),
      createdAt: Number(raw.createdAt) || 0,
      side: dec.game.current,
      steps: sol.length,
      builtin: false
    };
  }

  function toEntry(p) {
    return {
      id: p.id,
      title: p.title,
      code: p.code,
      solution: p.solution,
      intro: p.intro || '',
      hint: p.hint || '',
      author: p.author || '',
      createdAt: p.createdAt || 0,
      side: p.side === 1 ? 1 : 0,
      steps: p.solution.length
    };
  }

  function parseData(data, sha) {
    var arr = Array.isArray(data) ? data : (data && Array.isArray(data.puzzles) ? data.puzzles : []);
    var out = [];
    var invalid = 0;
    arr.forEach(function (raw) {
      var p = normalize(raw);
      if (p) out.push(p); else invalid++;
    });
    return { puzzles: out, sha: sha || null, invalid: invalid };
  }

  function serialize(list) {
    return JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      puzzles: list.map(toEntry)
    }, null, 2) + '\n';
  }

  /* ------------------------------------------------------------ 读 */
  function readRemote() {
    return ghFetch(contentsUrl(), { auth: true }).then(function (data) {
      if (!data) return { puzzles: [], sha: null, invalid: 0, empty: true };
      if (!data.content && data.download_url) {
        return fetch(data.download_url, { cache: 'no-store' }).then(function (r) {
          if (!r.ok) throw new Error('题库文件读取失败（HTTP ' + r.status + '）');
          return r.text();
        }).then(function (text) {
          var parsed = parseData(JSON.parse(text), data.sha);
          parsed.empty = false;
          return parsed;
        });
      }
      var text = b64decode(data.content || '');
      var parsed = text.trim() ? parseData(JSON.parse(text), data.sha) : { puzzles: [], sha: data.sha, invalid: 0, empty: true };
      return parsed;
    }, function (err) {
      if (err.status === 404) return { puzzles: [], sha: null, invalid: 0, empty: true };
      throw err;
    });
  }

  function rawLoad() {
    return fetch(RAW + '?t=' + Date.now(), { cache: 'no-store' }).then(function (res) {
      if (res.status === 404) return { puzzles: [], sha: null, invalid: 0, empty: true };
      if (!res.ok) throw new Error('题库读取失败（HTTP ' + res.status + '）');
      return res.text().then(function (text) {
        if (!text.trim()) return { puzzles: [], sha: null, invalid: 0, empty: true };
        var data;
        try { data = JSON.parse(text); } catch (e) { throw new Error('题库文件不是有效的 JSON'); }
        return parseData(data, null);
      });
    });
  }

  function cacheGet() { return LBQ.store.get(CACHE_KEY, null); }
  function cacheSet(list) {
    LBQ.store.set(CACHE_KEY, { puzzles: list.map(toEntry), at: Date.now() });
  }

  function load() {
    var a = auth();
    var p;
    if (a) {
      p = readRemote().then(function (r) {
        r.source = 'api';
        if (!r.empty) return r;
        // 空仓库、或 Token 看不到该仓库：用公开 raw 再确认一次
        return rawLoad().then(function (raw) {
          raw.source = 'raw';
          if (raw.puzzles.length) raw.tokenIssue = true;
          return raw;
        }, function () { return r; });
      }, function (err) {
        if (err.status === 401 || err.status === 403) {
          return rawLoad().then(function (r) {
            r.source = 'raw';
            r.error = 'Token 无效或无权限，已改为公开读取';
            r.tokenIssue = true;
            return r;
          });
        }
        throw err;
      });
    } else {
      p = rawLoad().then(function (r) { r.source = 'raw'; return r; });
    }
    return p.then(function (r) {
      if (!r.error) cacheSet(r.puzzles);
      return r;
    }).catch(function (err) {
      var cache = cacheGet();
      if (cache && cache.puzzles && cache.puzzles.length) {
        return { puzzles: cache.puzzles.map(normalize).filter(Boolean), cached: true, at: cache.at, sha: null, invalid: 0, error: err.message || String(err) };
      }
      return { puzzles: [], sha: null, invalid: 0, error: err.message || String(err) };
    });
  }

  /* ------------------------------------------------------------ 写 */
  function createInitialFile(text, message) {
    return ghFetch(API_REPO + '/git/blobs', {
      method: 'POST', auth: true, body: { content: b64encode(text), encoding: 'base64' }
    }).then(function (blob) {
      return ghFetch(API_REPO + '/git/trees', {
        method: 'POST', auth: true,
        body: { tree: [{ path: REPO.path, mode: '100644', type: 'blob', sha: blob.sha }] }
      }).then(function (tree) {
        return ghFetch(API_REPO + '/git/commits', {
          method: 'POST', auth: true,
          body: { message: message, tree: tree.sha, parents: [] }
        });
      }).then(function (commit) {
        return ghFetch(API_REPO + '/git/refs', {
          method: 'POST', auth: true,
          body: { ref: 'refs/heads/' + REPO.branch, sha: commit.sha }
        });
      }).then(function () { return { sha: null }; });
    }).catch(function (err) {
      if (err.status === 422) return { sha: null };
      throw err;
    });
  }

  function putFile(text, sha, message) {
    var body = { message: message, content: b64encode(text), branch: REPO.branch };
    if (sha) body.sha = sha;
    return ghFetch(contentsUrl().replace(/\?ref=[^&]*$/, ''), {
      method: 'PUT', auth: true, body: body
    }).then(function (data) {
      return { sha: data && data.content ? data.content.sha : null };
    }, function (err) {
      if (!sha && (err.status === 404 || err.status === 409 || err.status === 422)) {
        return createInitialFile(text, message);
      }
      throw err;
    });
  }

  function mutate(mutator, message, attempt) {
    attempt = attempt || 0;
    if (!hasToken()) return Promise.reject(new Error('还没有连接 GitHub 题库'));
    return readRemote().then(function (remote) {
      var next = mutator(remote.puzzles.slice());
      if (!next) return { puzzles: remote.puzzles, sha: remote.sha, noop: true };
      var text = serialize(next);
      return putFile(text, remote.sha, message).then(function (put) {
        cacheSet(next);
        return { puzzles: next, sha: put.sha };
      }, function (err) {
        if (err.status === 409 && attempt < 2) return mutate(mutator, message, attempt + 1);
        throw err;
      });
    });
  }

  function upload(puzzle) {
    var entry;
    try { entry = normalize(puzzle); } catch (e) { entry = null; }
    if (!entry) return Promise.reject(new Error('题目数据无效：请检查局面与解法'));
    entry.author = entry.author || name() || ((auth() && auth().login) || '');
    entry.createdAt = entry.createdAt || Date.now();
    return mutate(function (list) {
      var next = list.filter(function (p) { return p.id !== entry.id; });
      next.unshift(entry);
      return next;
    }, 'Add puzzle: ' + entry.title).then(function (r) {
      r.puzzle = entry;
      return r;
    });
  }

  function remove(id) {
    return mutate(function (list) {
      var next = list.filter(function (p) { return p.id !== id; });
      return next.length === list.length ? null : next;
    }, 'Remove puzzle ' + id);
  }

  /* ------------------------------------------------------------ 时间 */
  function ago(ts) {
    if (!ts) return '';
    var s = Math.max(0, Math.round((Date.now() - ts) / 1000));
    if (s < 45) return '刚刚';
    if (s < 3600) return Math.round(s / 60) + ' 分钟前';
    if (s < 86400) return Math.round(s / 3600) + ' 小时前';
    return Math.round(s / 86400) + ' 天前';
  }

  LBQ.puzzles = {
    REPO: REPO,
    REPO_URL: REPO_URL,
    FILE_URL: FILE_URL,
    TOKEN_URL: TOKEN_URL,
    auth: auth,
    hasToken: hasToken,
    token: token,
    name: name,
    login: function () { var a = auth(); return a && a.login ? a.login : ''; },
    setAuth: setAuth,
    clearAuth: clearAuth,
    testToken: testToken,
    load: load,
    upload: upload,
    remove: remove,
    cacheGet: cacheGet,
    cacheSet: cacheSet,
    normalize: normalize,
    serialize: serialize,
    encode: b64encode,
    decode: b64decode,
    ago: ago
  };
})(window.LBQ = window.LBQ || {});
