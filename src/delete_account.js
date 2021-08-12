import React, { Component } from 'react';
import ReactDOM from 'react-dom';

import './login.css';

import { API_ROOT } from './old_infrastructure/const';
import { get_json, API_VERSION_PARAM } from './old_infrastructure/functions';
import { RecaptchaV2Popup } from './login.js';

import {
  GoogleReCaptchaProvider,
  GoogleReCaptcha,
} from 'react-google-recaptcha-v3';

const LOGIN_POPUP_ANCHOR_ID = 'pkuhelper_login_popup_anchor';

class UnregisterPopupSelf extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading_status: 'idle',
      recaptcha_verified: false,
      phase: -1,
      // excluded_scopes: [],
    };

    this.ref = {
      username: React.createRef(),
      email_verification: React.createRef(),
      nonce: React.createRef(),
      checkbox_account: React.createRef(),
    };

    this.popup_anchor = document.getElementById(LOGIN_POPUP_ANCHOR_ID);
    if (!this.popup_anchor) {
      this.popup_anchor = document.createElement('div');
      this.popup_anchor.id = LOGIN_POPUP_ANCHOR_ID;
      document.body.appendChild(this.popup_anchor);
    }
  }

  valid_registration() {
    if (!this.ref.checkbox_account.current.checked) {
      alert('请同意条款与条件！');
      return 1;
    }
    return 0;
  }

  next_step() {
    if (this.state.loading_status === 'loading') return;
    switch (this.state.phase) {
      case -1:
        this.verify_email('v3', () => {});
        break;
      case 1:
        this.delete_account();
        break;
      case 3:
        this.need_recaptcha();
        break;
    }
  }

  verify_email(version, failed_callback) {
    const old_token = new URL(location.href).searchParams.get('old_token');
    const email = this.ref.username.current.value;
    const recaptcha_version = version;
    const recaptcha_token = localStorage['recaptcha'];
    // VALIDATE EMAIL IN FRONT-END HERE
    const body = new URLSearchParams();
    Object.entries({
      email,
      old_token,
      recaptcha_version,
      recaptcha_token,
    }).forEach((param) => body.append(...param));
    this.setState(
      {
        loading_status: 'loading',
      },
      () => {
        fetch(
          API_ROOT +
            'security/login/check_email_unregister?' +
            API_VERSION_PARAM(),
          {
            method: 'POST',
            body,
          },
        )
          .then((res) => res.json())
          .then((json) => {
            // COMMENT NEXT LINE
            //json.code = 2;
            if (json.code < 0) throw new Error(json.msg);
            this.setState({
              loading_status: 'done',
              phase: json.code,
            });
            if (json.code === 3) failed_callback();
          })
          .catch((e) => {
            alert('邮箱检验失败\n' + e + '\n'+ '详情请联系contact@bucthole.com');
            this.setState({
              loading_status: 'done',
            });
            console.error(e);
          });
      },
    );
  }

  async delete_account() {
    if (this.valid_registration() !== 0) return;
    const email = this.ref.username.current.value;
    const valid_code = this.ref.email_verification.current.value;
    const nonce = this.ref.nonce.current.value;
    const body = new URLSearchParams();
    Object.entries({
      email,
      nonce,
      valid_code,
    }).forEach((param) => body.append(...param));
    this.setState(
      {
        loading_status: 'loading',
      },
      () => {
        fetch(API_ROOT + 'security/login/unregister?' + API_VERSION_PARAM(), {
          method: 'POST',
          body,
        })
          .then(get_json)
          .then((json) => {
            if (json.code !== 0) {
              if (json.msg) throw new Error(json.msg);
              throw new Error(JSON.stringify(json));
            }

            alert('注销账户成功');
            this.setState({
              loading_status: 'done',
            });
            this.props.on_close();
          })
          .catch((e) => {
            console.error(e);
            alert('失败\n' + e);
            this.setState({
              loading_status: 'done',
            });
          });
      },
    );
  }

  need_recaptcha() {
    console.log(3);
  }

  render() {
    window.recaptchaOptions = {
      useRecaptchaNet: true,
    };
    return ReactDOM.createPortal(
      <GoogleReCaptchaProvider
        reCaptchaKey={process.env.REACT_APP_RECAPTCHA_V3_KEY}
        useRecaptchaNet={true}
      >
        <div>
          <div className="treehollow-login-popup-shadow" />
          <div className="treehollow-login-popup margin-popup">
            {this.state.phase === -1 && (
              <>
                <p>
                  <b>输入邮箱来注销账户/找回密码</b>
                </p>
              </>
            )}
            <p style={this.state.phase === -1 ? {} : { display: 'none' }}>
              <label>
                邮箱&nbsp;
                <input
                  ref={this.ref.username}
                  type="email"
                  autoFocus={true}
                  defaultValue="@mail.buct.edu.cn"
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      this.next_step();
                    }
                  }}
                />
              </label>
            </p>
            {this.state.phase === 1 && (
              <>
                <p>
                  <b>{process.env.REACT_APP_TITLE} 注销账户</b>
                </p>
                <p>
                  <label>
                    邮箱验证码&nbsp;
                    <input
                      ref={this.ref.email_verification}
                      type="tel"
                      autoFocus={true}
                    />
                  </label>
                </p>
                <p>
                  Nonce：&nbsp;
                  <label>
                    <input ref={this.ref.nonce} autoFocus={true} />
                  </label>
                </p>
                <p>
                  注：Nonce是注册树洞时欢迎邮件中的“找回密码口令”，形如xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx。
                </p>
                <p>
                  <label>
                    <input type="checkbox" ref={this.ref.checkbox_account} />
                    我已经了解了注销账户后，原账户的发帖、评论将保留；注销账户后可以重新注册树洞，但原账户的关注列表、评论区昵称等关联数据将丢失。
                  </label>
                </p>
              </>
            )}
            {this.state.phase === 3 && (
              <>
                <p>
                  <b>输入验证码 {process.env.REACT_APP_TITLE}</b>
                </p>
                <RecaptchaV2Popup
                  callback={() => {
                    this.verify_email('v2', () => {
                      alert('reCAPTCHA风控系统校验失败');
                    });
                  }}
                >
                  {(do_popup) => (
                    <p>
                      {!this.state.recaptcha_verified && (
                        <GoogleReCaptcha
                          onVerify={(token) => {
                            this.setState({
                              recaptcha_verified: true,
                            });
                            console.log(token);
                            localStorage['recaptcha'] = token;
                            this.verify_email('v3', do_popup);
                          }}
                        />
                      )}
                    </p>
                  )}
                </RecaptchaV2Popup>
              </>
            )}
            <p>
              <button
                onClick={this.next_step.bind(this)}
                disabled={this.state.loading_status === 'loading'}
              >
                下一步
              </button>
              <button onClick={this.props.on_close}>取消</button>
            </p>
          </div>
        </div>
      </GoogleReCaptchaProvider>,
      this.popup_anchor,
    );
  }
}

export class UnregisterPopup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      popup_show: false,
    };
    this.on_popup_bound = this.on_popup.bind(this);
    this.on_close_bound = this.on_close.bind(this);
  }

  on_popup() {
    this.setState({
      popup_show: true,
    });
  }

  on_close() {
    this.setState({
      popup_show: false,
    });
  }

  render() {
    return (
      <>
        {this.props.children(this.on_popup_bound)}
        {this.state.popup_show && (
          <UnregisterPopupSelf on_close={this.on_close_bound} />
        )}
      </>
    );
  }
}
