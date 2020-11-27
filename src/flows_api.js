import { API_VERSION_PARAM } from './infrastructure/functions';
import { THUHOLE_API_ROOT } from './infrastructure/const';
import { cache } from './cache';

export { THUHOLE_API_ROOT, API_VERSION_PARAM };

export function token_param(token) {
  return API_VERSION_PARAM() + (token ? '&user_token=' + token : '');
}

export function get_json(res) {
  if (!res.ok) throw Error(`网络错误 ${res.status} ${res.statusText}`);
  return res.text().then((t) => {
    try {
      return JSON.parse(t);
    } catch (e) {
      console.error('json parse error');
      console.trace(e);
      console.log(t);
      throw new SyntaxError('JSON Parse Error ' + t.substr(0, 50));
    }
  });
}

function add_variant(li) {
  li.forEach((item) => {
    item.variant = {};
  });
}

const SEARCH_PAGESIZE = 50;

const handle_response = async (response, notify = false, add_v = true) => {
  let json = await get_json(response);
  if (json.code !== 0) {
    if (json.msg) {
      if (notify) alert(json.msg);
      else throw new Error(json.msg);
    } else throw new Error(JSON.stringify(json));
  }
  if (add_v) {
    add_variant(json.data);
  }
  return json;
};

export const API = {
  load_replies: (pid, token, color_picker) => {
    pid = parseInt(pid);
    return fetch(
      THUHOLE_API_ROOT + 'contents/post/detail?pid=' + pid + token_param(token),
    )
      .then(get_json)
      .then((json) => {
        if (json.code !== 0) {
          throw new Error(json.msg);
        }

        cache().put(pid, json.post.updated_at, json);

        // also change load_replies_with_cache!
        json.post.variant = {};
        json.data = json.data.map((info) => {
          info._display_color = color_picker.get(info.name);
          info.variant = {};
          return info;
        });

        return json;
      });
  },

  load_replies_with_cache: (pid, token, color_picker, cache_version) => {
    pid = parseInt(pid);
    return cache()
      .get(pid, cache_version)
      .then(([json, reason]) => {
        if (json) {
          // also change load_replies!
          json.post.variant = {};
          json.data = json.data.map((info) => {
            info._display_color = color_picker.get(info.name);
            info.variant = {};
            return info;
          });

          return json;
        } else {
          return API.load_replies(pid, token, color_picker).then((json) => {
            if (reason === 'expired') json.post.variant.new_reply = true;
            return json;
          });
        }
      });
  },

  set_attention: async (pid, attention, token) => {
    let data = new URLSearchParams();
    data.append('user_token', token);
    data.append('pid', pid);
    data.append('switch', attention ? '1' : '0');
    let response = await fetch(
      THUHOLE_API_ROOT + 'edit/attention?' + token_param(token),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
      },
    );
    // Delete cache to update `attention` on next reload
    cache().delete(pid);
    return handle_response(response, true, false);
  },

  report: (item_type, id, report_type, reason, token) => {
    if (item_type !== 'post' && item_type !== 'comment')
      throw Error('bad type');
    let data = new URLSearchParams();
    data.append('id', id);
    data.append('reason', reason);
    data.append('type', report_type);
    return fetch(
      THUHOLE_API_ROOT + 'edit/report/' + item_type + '?' + token_param(token),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: data,
      },
    )
      .then(get_json)
      .then((json) => {
        if (json.code !== 0) throw new Error(json.msg);

        return json;
      });
  },

  get_list: async (page, token) => {
    let response = await fetch(
      THUHOLE_API_ROOT +
        'contents/post/list' +
        '?page=' +
        page +
        token_param(token),
    );
    return handle_response(response);
  },

  get_search: async (page, keyword, token, is_attention = false) => {
    console.log(is_attention === true ? '/attentions' : '');
    let response = await fetch(
      THUHOLE_API_ROOT +
        'contents/search' +
        (is_attention === true ? '/attentions' : '') +
        '?pagesize=' +
        SEARCH_PAGESIZE +
        '&page=' +
        page +
        '&keywords=' +
        encodeURIComponent(keyword) +
        token_param(token),
    );
    return handle_response(response);
  },

  get_attention: async (page, token) => {
    let response = await fetch(
      THUHOLE_API_ROOT +
        'contents/post/attentions?page=' +
        page +
        token_param(token),
    );
    return handle_response(response);
  },
};
