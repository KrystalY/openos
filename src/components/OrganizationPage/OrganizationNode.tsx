import React, { useEffect, useState, ImgHTMLAttributes, useMemo } from "react";
import styled from "styled-components";
import { arrayLike } from "../../common/util";
import { EconnectType, EnodeGubun, EuserState } from "../../enum";
import useConfig from "../../hooks/useConfig";

import { makeCall } from "../../common/ipcCommunication/ipcIpPhone";
import { writeWarn } from "../../common/ipcCommunication/ipcLogger";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { addChatRoomFromOrganization } from "../../redux/actions/chat_actions";

type TOrganizationNodeProps = {
  data: TTreeNode;
  index: number;
  selectedKeys: (string | number)[];
  rightClickedKey: string | number;
  setFinalSelectedKeys: (finalSelectedKeys: (string | number)[]) => void;
  setSelectedKeys: (selectedKeys: (string | number)[]) => void;
  setMessageModalVisible: (visible: any) => void;
};

type UserRowProps = {
  selected: boolean;
  rightClicked: boolean;
};

export default function OrganizationNode(props: TOrganizationNodeProps) {
  const {
    data,
    index,
    // * selected노드 css 변경
    selectedKeys,
    // * rightClicked노드 css 변경
    rightClickedKey,
    // * 쪽지 보내기 창 팝업 시 final키 직접 변경
    setFinalSelectedKeys,
    // * 이미지 클릭 시 selectedKey 직접 변경
    setSelectedKeys,
    setMessageModalVisible,
  } = props;
  const { remote } = window.require("electron");
  const loginUser = remote.getGlobal("USER");
  const dispatch = useDispatch();
  const history = useHistory();
  const [visible, setVisible] = useState<boolean>(false);
  const { doubleClickBehavior } = useConfig();

  // ANCHOR memo
  const connectTypeConverter = () => {
    const connectTypeMaybeArr: string | string[] = data?.connectType
      ? data?.connectType.split(`|`)
      : ``;

    const connectType = arrayLike(connectTypeMaybeArr);
    return connectType.map((v: any) => EconnectType[Number(v)]).join(` `);
  };
  const connectType = useMemo(connectTypeConverter, []);

  const setSelected = () => {
    const selected = selectedKeys.indexOf(data?.key) > -1;
    return selected;
  };
  const selected = useMemo(setSelected, [selectedKeys]);

  const setRightClicked = () => {
    const rightClicked = rightClickedKey === data?.key;
    return rightClicked;
  };
  const rightClicked = useMemo(setRightClicked, [rightClickedKey]);

  // ANCHOR handler
  const handleDoubleClick = () => {
    if (doubleClickBehavior === `message`) {
      setFinalSelectedKeys([data?.key]);
      setMessageModalVisible((prev: boolean) => !prev);
    } else if (doubleClickBehavior === `chat`) {
      dispatch(
        addChatRoomFromOrganization(`${data?.userId}|${loginUser.userId}`)
      );
      history.push(`/chat`);
    }
  };

  const handleToggle = () => {
    setFinalSelectedKeys([data?.key]);
    setMessageModalVisible((prev: boolean) => !prev);
  };

  const handleDetailUnVisible = () => {
    setVisible(false);
  };

  const handleImageError = (image: any) => {
    image.target.onerror = null;
    image.target.src = "./images/img_imgHolder.png";
  };

  const handleDetailToggle = (e: any) => {
    if (data?.gubun !== EnodeGubun.ORGANIZATION_USER) return false;
    // * 프로필 사진 클릭 시 selectedKeys를 현재 노드의 키로 덮어씌움
    if (selectedKeys.indexOf(data?.key) === -1) {
      setSelectedKeys([data?.key]);
    }
    // 선택되지 않은 상태에서만 디테일 보이도록
    setVisible((prev) => !prev);
  };

  const handleChat = () => {
    dispatch(
      addChatRoomFromOrganization(`${data?.userId}|${loginUser.userId}`)
    );
    history.push(`/chat`);
  };

  /**
   * 전화걸기
   */
  const handleMaleCall = () => {
    if (data && data.userTelIpphone) {
      makeCall(data?.userTelIpphone);
    } else {
      writeWarn("make call fail! dest is empty!", data);
    }
  };

  return (
    <>
      {data?.gubun === EnodeGubun.GROUP || data?.gubun === EnodeGubun.DUMMY ? (
        <StyledDepartment>{data?.title}</StyledDepartment>
      ) : (
        <UserRow
          className={`user-row ${selected && `selected`} ${
            rightClicked && `rightClicked`
          }`}
          selected={selected}
          rightClicked={rightClicked}
          onDoubleClick={handleDoubleClick}
        >
          <div className="user-profile-state-wrap">
            <div className="user-pic-wrap">
              <img
                src={
                  data?.userPicturePos && /^http/.test(data?.userPicturePos)
                    ? data?.userPicturePos
                    : "./images/img_imgHolder.png"
                }
                style={{ width: `48px`, height: `48px` }}
                alt="user-profile-picture"
                onClick={handleDetailToggle}
                onBlur={handleDetailUnVisible}
                tabIndex={index}
                onError={handleImageError}
              />
              <div
                className={`user-state ${EuserState[Number(data?.userState)]}`}
              ></div>
              {visible && (
                <div className="user-info-container">
                  <div className="btn-close" onClick={handleDetailToggle}></div>
                  <div className="user-profile-state-wrap">
                    <div className="user-pic-wrap">
                      <img
                        src={
                          data?.userPicturePos &&
                          /^http/.test(data?.userPicturePos)
                            ? data?.userPicturePos
                            : "./images/img_imgHolder.png"
                        }
                        alt="user-profile-picture"
                        style={{ width: `48px`, height: `48px` }}
                        onError={handleImageError}
                      />
                    </div>
                    <div
                      className={`user-state ${
                        EuserState[Number(data?.userState)]
                      }`}
                    ></div>
                  </div>
                  <div className="user-info-wrap">
                    <div className="user-info-wrap-inner">
                      <h6 className="user-name">{data?.title}</h6>
                      <span className="user-position">
                        {data?.userPayclName}
                      </span>
                      <span className="user-department">
                        {data?.userGroupName}
                      </span>
                    </div>
                    <div className="user-alias">{data?.userAliasName}</div>
                  </div>
                  <div className="user-contact-wrap">
                    <div className="user-phone" title="전화번호">
                      {data?.userTelOffice}
                    </div>
                    <div className="user-mobile" title="휴대폰번호">
                      {data?.userTelMobile}
                    </div>
                    <div className="user-email" title="이메일">
                      {data?.userEmail}
                    </div>
                  </div>
                  <div className="go-to-contact-action">
                    <div
                      className="btn-contact-action chat"
                      title="채팅"
                      onMouseDown={handleChat}
                    ></div>
                    <div
                      className="btn-contact-action message"
                      title="쪽지"
                      onMouseDown={handleToggle}
                    ></div>
                    <div
                      className="btn-contact-action remote"
                      title="원격제어"
                    ></div>
                    <div className="btn-contact-action call" title="통화"></div>
                    <div
                      className="btn-contact-action voice-talk"
                      title="보이스톡"
                    ></div>
                    <div
                      className="btn-contact-action video-talk"
                      title="비디오톡"
                    ></div>
                    <div
                      className="btn-contact-action email"
                      title="이메일"
                    ></div>
                    <div
                      className="btn-contact-action float"
                      title="플로팅"
                    ></div>
                    <div className="clearfix"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="user-info-wrap">
            <div className="user-info-wrap-inner">
              <h6 className="user-name">{data?.title}</h6>
              <span className="user-position">{data?.userPayclName}</span>
              <span className="user-department">{data?.userGroupName}</span>
              <span
                className={connectType && `user-login-device ${connectType}`}
                title="로그인 디바이스"
              ></span>
            </div>
            <div className="user-alias">{data?.userAliasName}</div>
            <div className="user-contact-wrap">
              <span className="user-phone">{data?.userTelOffice}</span>
              <span className="user-mobile">{data?.userTelMobile}</span>
            </div>
          </div>
          <div className="user-quick-action-wrap">
            <div className="btn-quick chat" onClick={handleChat}></div>
            <div className="btn-quick message" onClick={handleToggle}></div>
            <div className="btn-quick call" onClick={handleMaleCall}></div>
          </div>
        </UserRow>
      )}
    </>
  );
}

const StyledDepartment = styled.h6`
  background-color: #ebedf1;
  padding: 4px 8px 4px 0;
  width: 100%;

  /* border-bottom과 font-size는 변경하지 말 것. switcher icon크기에 맞게끔 조정 되어 있음. */
  border-bottom: 1px solid #dfe2e8;
  font-size: 14px;
  cursor: pointer;
`;

const UserRow = styled.li`
  background-color: ${(props: UserRowProps) => props.selected && `#fff`};
  border: ${(props: UserRowProps) =>
    props.selected
      ? `1px solid #ebedf1`
      : props.rightClicked
      ? `1px solid #e0e0e0`
      : ``};
`;
