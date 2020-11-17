import React, { useState, useEffect, useMemo, HTMLFactory } from "react";
import Tree, { TreeNode } from "rc-tree";
import styled from "styled-components";
import "../../assets/css/Tree.scss";
import Modal from "react-modal";
import Node from "./OrganizationNode";
import { EventDataNode } from "rc-tree/lib/interface";
import { setStatusMonitor } from "../../common/ipcCommunication/ipcCommon";
import {
  getBaseOrg,
  getChildOrg,
  getUserInfos,
  searchOrgUsers,
} from "../../common/ipcCommunication/ipcOrganization";
import useTree from "../../hooks/useTree";
import useSearch from "../../hooks/useSearch";
import {
  arrayLike,
  convertToUser,
  find,
  getRandomNumber,
} from "../../common/util";
import { commonModalStyles, messageInputModalStyle } from "../../common/styles";
import { Efavorite, EnodeGubun } from "../../enum";
import useStateListener from "../../hooks/useStateListener";
import MessageInputModal from "../../common/components/SendMessageModal/MessageInputModal";
import AddToFavoriteModal from "../../common/components/Modal/AddToFavoriteModal";
import AddGroupToFavoriteModal from "../../common/components/Modal/AddGroupToFavoriteModal";
import { useDispatch } from "react-redux";
import { useHistory } from "react-router-dom";
import { addChatRoomFromOrganization } from "../../redux/actions/chat_actions";

let _orgCode: string = ``;

export default function OrganizationPage() {
  // ANCHOR state
  const { remote } = window.require("electron");
  const loginUser = remote.getGlobal("USER");
  const history = useHistory();
  const dispatch = useDispatch();
  const { treeData, expandedKeys, setTreeData, setExpandedKeys } = useTree({
    type: `organization`,
  });
  const [selectedGroupInfo, setSelectedGroupInfo] = useState({});
  const [selectedKeys, setSelectedKeys] = useState<(string | number)[]>([]);
  const [rightClickedKey, setRightClickedKey] = useState<string | number>(0);
  const [finalSelectedKeys, setFinalSelectedKeys] = useState<
    (string | number)[]
  >([]);

  const {
    searchMode,
    searchKeyword,
    searchResult,
    setSearchMode,
    setSearchKeyword,
    setSearchResult,
  } = useSearch({ type: `organization` });

  const targetInfo = useStateListener();

  const [
    addGroupToFavoriteModalVisible,
    setAddGroupToFavoriteModalVisible,
  ] = useState<boolean>(false);
  const [addToFavoriteModalVisible, setAddToFavoriteModalVisible] = useState<
    boolean
  >(false);

  const [messageModalVisible, setMessageModalVisible] = useState<boolean>(
    false
  );

  const [userContextMenuVisible, setUserContextMenuVisible] = useState<boolean>(
    false
  );
  const [groupContextMenuVisible, setGroupContextMenuVisible] = useState<
    boolean
  >(false);

  const [clickedNodeWidth, setClickedNodeWidth] = useState<number>(0);

  const [pageX, setPageX] = useState<number>(0);

  const [pageY, setPageY] = useState<number>(0);

  // ANCHOR memo
  const leftPositionCalculator = () => {
    const percentage = Math.round((pageX / clickedNodeWidth) * 100);
    return percentage > 100 ? pageX - (pageX - clickedNodeWidth) * 0.8 : pageX;
  };

  const leftPosition = useMemo(leftPositionCalculator, [pageX]);

  // *  finalSelectedKeys가 변경된 후, key에서 날짜를 빼준 후, 중복값을 제거해서 쪽지 쓰기 컴포넌트로 넘겨준다.
  const setFinalFinalSelectedKeys = () => {
    const processed = finalSelectedKeys.map((v: string | number) =>
      v.toString().slice(0, v.toString().lastIndexOf(`_`))
    );
    return [...new Set([...processed])];
  };

  const finalFinalSelectedKeys = useMemo(setFinalFinalSelectedKeys, [
    finalSelectedKeys,
  ]);

  // ANCHOR effect
  useEffect(() => {
    if (!rightClickedKey) {
      setFinalSelectedKeys([]);
      return;
    }
    // * 선택해둔 노드를 rightClick하지 않은 경우 rightClickedKey를 fianl로 보냄.
    if (!selectedKeys.find((v: any) => v === rightClickedKey)) {
      setFinalSelectedKeys([rightClickedKey]);
    } else {
      setFinalSelectedKeys(selectedKeys);
    }
  }, [rightClickedKey]);

  useEffect(() => {
    const initiate = async () => {
      const [targetId, state, connectType] = targetInfo;
      const replica = [...treeData];
      const { v: target, i: targetI, list: targetList } = await find(
        replica,
        targetId
      );
      targetList?.splice(targetI, 1, {
        ...target,
        userState: Number(state),
        connectType,
      });
      setTreeData(replica);
    };
    initiate();
  }, [targetInfo]);

  useEffect(() => {
    const getRoot = async () => {
      const {
        data: {
          // 루트가 여러개인 경우는 root_node가 여러개로 들어온다.
          root_node: responseMaybeArr,
        },
      } = await getBaseOrg();

      // root_node가 하나일 경우에 배열에 담아준다. ( filter, map, reduce등을 분기문 없이 쓰기 위함)
      const response = arrayLike(responseMaybeArr);
      // 전체 root_node에서 사용자 id만 뽑아온다.
      const monitorIds = response
        .map((v: any) =>
          v.node_item
            .filter((v: any) => v.gubun?.value === EnodeGubun.ORGANIZATION_USER)
            .map((v: any) => v.user_id.value)
        )
        .reduce((prev: any, cur: any) => [...prev, ...cur], []);
      // root_node를 순회하며 각 root_node내의 node_item배열을 node_item객체로 변환한다.
      const root: TTreeNode[] = response.map((v: any) =>
        v.node_item.reduce((prev: any, cur: any, i: number): TTreeNode => {
          // 암묵적으로 node_item의 첫번째 인자는 루트 노드임을 가정한다.
          if (i === 0) {
            _orgCode = cur.org_code?.value;
            return {
              title: cur.group_name?.value,
              key: cur.group_seq?.value,
              children: [],
              gubun: cur.gubun?.value,
              groupCode: cur.group_code?.value,
              groupName: cur.group_name?.value,
              groupParentId: cur.group_parent_id?.value,
              groupSeq: cur.group_seq?.value,
              orgCode: cur.org_code?.value,
            };
          } else {
            // 루트 바로 아래에 사용자가 있음을 가정한다.
            if (cur.gubun.value === EnodeGubun.ORGANIZATION_USER) {
              return {
                ...prev,
                children: [
                  ...prev.children,
                  {
                    title: cur.user_name?.value,
                    key: cur.user_id?.value?.concat(`_`, getRandomNumber()),
                    ...convertToUser(cur),
                  },
                ],
              };
            } else {
              // 루트 아래에 부서가 있음을 가정한다 (일반적인 경우)
              return {
                ...prev,
                children: [
                  ...prev.children,
                  {
                    title: cur.group_name.value,
                    key: cur.group_seq.value,
                    children: [],
                    groupCode: cur.group_code.value,
                    groupName: cur.group_name.value,
                    groupParentId: cur.group_parent_id.value,
                    groupSeq: cur.group_seq.value,
                    gubun: cur.gubun.value,
                    orgCode: cur.org_code.value,
                  },
                ],
              };
            }
          }
        }, {})
      );
      // root_node를 순회하며 최상위 키만 뽑아온다.
      const rootKeys = root.map((v: any) => v.key);
      // 모든 root_node는 하나의 org_code를 공유한다고 가정한다?

      setTreeData(root);

      setExpandedKeys(rootKeys);
      setStatusMonitor(monitorIds);
    };
    !treeData.length && getRoot();
  }, []);

  // ANCHOR handler
  const handleSendGroupMessage = async () => {
    const { v } = await find(treeData, rightClickedKey);

    const {
      data: {
        root_node: { node_item: response },
      },
    } = await getChildOrg(v.orgCode, v.groupCode, -1);

    // * final키가 변경되면 자동으로 마지막 _{randomKey}를 제거하기 때문에, _를 마지막에 붙여준다.
    const userIds = arrayLike(response)
      .filter((v: any) => v.gubun.value === EnodeGubun.ORGANIZATION_USER)
      .map((v: any) => v.user_id.value?.concat(`_`));

    setFinalSelectedKeys(userIds);
    setMessageModalVisible(true);
  };

  const handleSendGroupChat = async () => {
    const { v } = await find(treeData, rightClickedKey);

    const {
      data: {
        root_node: { node_item: response },
      },
    } = await getChildOrg(v.orgCode, v.groupCode, -1);

    // * final키가 변경되면 자동으로 마지막 _{randomKey}를 제거하기 때문에, _를 마지막에 붙여준다.
    const userIds = arrayLike(response)
      .filter((v: any) => v.gubun.value === EnodeGubun.ORGANIZATION_USER)
      .map((v: any) => v.user_id.value);
    dispatch(
      addChatRoomFromOrganization(`${userIds.join(`|`)}|${loginUser.userId}`)
    );
    history.push(`/chat`);
  };

  const handleAddGroupToFavorite = async () => {
    const { v } = await find(treeData, rightClickedKey);
    setSelectedGroupInfo({
      orgCode: v.orgCode,
      groupCode: v.groupCode,
    });
    setAddGroupToFavoriteModalVisible(true);
  };

  const handleChat = () => {
    dispatch(
      addChatRoomFromOrganization(
        `${finalFinalSelectedKeys.join(`|`)}|${loginUser.userId}`
      )
    );
    history.push(`/chat`);
  };

  const handleExpand = (expandedKeys: (string | number)[]): void => {
    setExpandedKeys(expandedKeys);
  };

  const handleRightClick = (info: any) => {
    const {
      node: { gubun, key: newSelectedKey },
    } = info;
    if (gubun === EnodeGubun.ORGANIZATION_USER) {
      // * 유저 클릭 시
      // * 프로필 사진 클릭 시 작동 안함
      if (info.event.nativeEvent.target.localName === `img`) return false;
      setRightClickedKey(newSelectedKey);
      setUserContextMenuVisible(true);
      setClickedNodeWidth(
        info.event.nativeEvent.path.find((v: any) => v.localName === `li`)
          .offsetWidth
      );

      // TODO depth계산해서 node에 넣어준 후, pageX에 1depth당 +30px씩 증감해야 함
    } else {
      // * 부서 클릭 시
      setClickedNodeWidth(
        info.event.nativeEvent.path.find(
          (v: any) => v.classList[0] === `rc-tree-treenode`
        ).offsetWidth
      );
      setRightClickedKey(newSelectedKey);
      setGroupContextMenuVisible(true);
    }

    setPageX(info.event.pageX);
    setPageY(info.event.pageY);
  };

  const handleUserContextMenuClose = () => {
    setUserContextMenuVisible(false);
    // * rightClicked시에만 생기는 특수 border는 contextMenu가 close될 때 같이 사라진다.
    setRightClickedKey(``);
  };

  const handleGroupContextMenuClose = () => {
    setGroupContextMenuVisible(false);
    // * rightClicked시에만 생기는 특수 border는 contextMenu가 close될 때 같이 사라진다.
    setRightClickedKey(``);
  };

  const handleSelect = async (_: any, e: any) => {
    const {
      nativeEvent: { shiftKey, metaKey, ctrlKey },
      node: { key: newSelectedKey, gubun },
    } = e;

    // * 부서 선택 시
    if (gubun !== EnodeGubun.ORGANIZATION_USER) {
      // * 이미 부서가 펼쳐져 있으면 expandedKeys에서 제외
      if (expandedKeys.indexOf(newSelectedKey) > -1) {
        setExpandedKeys(
          expandedKeys.filter((v: string | number) => v !== newSelectedKey)
        );
        // * 부서가 펼쳐지지 않았다면 expandedKeys에 push
      } else {
        setExpandedKeys([...expandedKeys, newSelectedKey]);
      }
      return false;
    }

    // * 일반 클릭 시 클릭한 노드의 키로 selectedKeys를 덮어씌움.
    if (!shiftKey && !metaKey && !ctrlKey) {
      setSelectedKeys([newSelectedKey]);
    }

    // * ctrl키 (맥 os일 경우 cmd키) 클릭 시
    if (!shiftKey && (metaKey || ctrlKey)) {
      // * 이미 선택된 노드를 클릭 시 해당 노드의 키를 selectedKeys에서 제외
      if (selectedKeys.indexOf(newSelectedKey) > -1) {
        setSelectedKeys(
          selectedKeys.filter((v: string | number) => v !== newSelectedKey)
        );
      } else {
        // * 그 외의 경우 selectedKeys에 push
        setSelectedKeys([...selectedKeys, newSelectedKey]);
      }
    }

    if (shiftKey && !metaKey && !ctrlKey) {
      // * 현재 조직도에서 유저 키만 모두 뽑아옴
      const flatUserKeys = spread(searchMode ? searchResult : treeData, []);

      // * 마지막으로 selectedKeys에 push된 키/ flatUserKeys에서의 인덱스 ( 없을 시 flatUserKeys의 첫번째 키 )
      const lastSelectedKey = selectedKeys[selectedKeys.length - 1];
      let lastSelectedKeyIndex = flatUserKeys.indexOf(
        lastSelectedKey?.toString()
      );

      if (lastSelectedKeyIndex === -1) {
        lastSelectedKeyIndex = 0;
      }

      // * 클릭한 노드의 키의 flatUserKeys에서의 인덱스
      const newSelectedKeyIndex = flatUserKeys.indexOf(
        newSelectedKey?.toString()
      );

      // * 마지막으로 selectedKeys에 push된 키 ~ 클릭한 노드의 키를 모두 반환
      let range = [];
      if (lastSelectedKeyIndex - newSelectedKeyIndex < 0) {
        range = flatUserKeys.slice(
          lastSelectedKeyIndex,
          newSelectedKeyIndex + 1
        );
      } else {
        range = flatUserKeys.slice(
          newSelectedKeyIndex,
          lastSelectedKeyIndex + 1
        );
      }
      setSelectedKeys([...new Set([...selectedKeys, ...range])]);
    }
  };

  const handleKeywordChange = (e: any) => {
    setSearchKeyword(e.target.value);
  };

  const handleSearch = (e: any) => {
    const which = e.which;
    const keyword = e.target.value;

    const getSearchResult = async () => {
      // * 검색 시 selectedKeys 날림.
      setSelectedKeys([]);
      const {
        data: {
          root_node: { node_item: responseMaybeArr },
        },
      } = await searchOrgUsers(_orgCode, keyword);

      // 검색 결과가 없을 경우
      if (!responseMaybeArr) {
        const searchRoot: TTreeNode[] = [
          {
            title: Efavorite.SEARCH_RESULT,
            key: Efavorite.SEARCH_RESULT,
            children: [],
            gubun: EnodeGubun.GROUP,
          },
        ];
        setSearchMode(true);
        setSearchKeyword(keyword);
        setSearchResult(searchRoot);
        return false;
      }

      // 결과값이 하나일 경우를 가정하여 배열로 감쌈.
      const response = arrayLike(responseMaybeArr);
      // 유저 id만 추출한 후
      const userIdsMaybeDuplicated: string[] = response.map(
        (v: any) => v.user_id.value
      );

      // 중복 제거.
      const userIds = [...new Set(userIdsMaybeDuplicated)];

      // 중복제거한 id배열로 상세정보를 가져온다.
      const {
        data: {
          items: { node_item: secondResponseMaybeArr },
        },
      } = await getUserInfos(userIds);

      // 결과값이 하나일 경우를 가정하여 배열로 감쌈.
      const secondResponse = arrayLike(secondResponseMaybeArr);
      // 상세정보 useSchema에 매핑.
      const userSchema = secondResponse.map((v: any) => ({
        title: v.user_name?.value,
        key: v.user_id.value?.concat(`_`, getRandomNumber()),
        gubun: v.gubun.value,
        ...convertToUser(v),
      }));

      const searchRoot: TTreeNode[] = [
        {
          title: Efavorite.SEARCH_RESULT,
          key: Efavorite.SEARCH_RESULT,
          children: userSchema,
          gubun: EnodeGubun.GROUP,
        },
      ];

      setSearchMode(true);
      setSearchKeyword(keyword);
      setSearchResult(searchRoot);
    };

    if (which === 13) {
      if (keyword) {
        getSearchResult();
      } else {
        setSearchMode(false);
      }
    }
  };

  // ANCHOR etc
  const getChild = async (groupCode: string) => {
    const {
      data: {
        root_node: { node_item: responseMaybeArr },
      },
    } = await getChildOrg(_orgCode, groupCode, -1);

    // 자식이 하나일 경우를 가정하여 배열로 감싼다.
    const response = arrayLike(responseMaybeArr);
    const children: TTreeNode[] = response
      ?.filter((_: any, i: number) => i !== 0)
      .map((v: any) => {
        const defaultProps = {
          gubun: v.gubun.value,
          groupParentId: v.group_parent_id.value,
          groupSeq: v.group_seq.value,
          orgCode: v.org_code.value,
        };

        if (v.gubun.value === EnodeGubun.ORGANIZATION_USER) {
          const userProps = {
            key: v.user_id?.value?.concat(`_`, getRandomNumber()),
            title: v.user_name?.value,
            ...convertToUser(v),
          };
          return Object.assign(defaultProps, userProps);
        } else {
          // 부서
          const departmentProps = {
            key: v.group_seq.value,
            children: [],
            title: v.group_name?.value,
            groupCode: v.group_code.value,
            groupName: v.group_name.value,
          };
          return Object.assign(defaultProps, departmentProps);
        }
      });
    const monitorIds = response
      .filter((v: any) => v.gubun?.value === EnodeGubun.ORGANIZATION_USER)
      .map((v: any) => v.user_id.value);
    setStatusMonitor(monitorIds);
    return children;
  };

  // attach children
  const attach = (
    prev: TTreeNode[],
    key: number,
    children: TTreeNode[]
  ): TTreeNode[] =>
    prev.map((v) => {
      // 1 depth searching
      if (Number(v.key) === Number(key)) {
        return {
          ...v,
          children,
        };
        // children searching
      } else if (v.children) {
        return {
          ...v,
          children: attach(v.children, key, children),
        };
      }
      return v;
    });

  // load children
  const load = (e: EventDataNode): Promise<void> => {
    return new Promise(async (resolve) => {
      // avoid duplicated axios call
      if (e.children) {
        resolve();
        return;
        // if the node yet to load chilren, execute axios call.
      }
      const { v } = await find(treeData, e.key);
      const children = await getChild(v.groupCode!);
      // update tree
      setTreeData(attach(treeData, Number(e.key), children));

      resolve();
    });
  };

  const spread = (tree: TTreeNode[], list: (string | number)[]) => {
    tree.forEach((v: any) => {
      if (v.gubun !== EnodeGubun.GROUP) {
        list.push(v.key);
      }
      if (v.children) {
        spread(v.children, list);
      }
    });

    return list;
  };

  const switcherGenerator = (data: any) => (
    <>
      {(data?.gubun === EnodeGubun.GROUP ||
        data?.gubun === EnodeGubun.DUMMY) && (
        <Switcher>
          {!data?.expanded ? (
            <img
              src="./images/icon_toggle_plus.png"
              style={{ minWidth: `20px`, height: `21px` }}
            />
          ) : (
            <img
              src="./images/icon_toggle_min.png"
              style={{ minWidth: `20px`, height: `21px` }}
            />
          )}
        </Switcher>
      )}
    </>
  );

  // need to be memorized
  const renderTreeNodes = (data: TTreeNode[]) => {
    return data.map((item, index) => {
      if (item.children) {
        return (
          <TreeNode
            {...item}
            title={
              <Node
                data={item}
                index={index}
                selectedKeys={selectedKeys}
                rightClickedKey={rightClickedKey}
                setSelectedKeys={setSelectedKeys}
                setFinalSelectedKeys={setFinalSelectedKeys}
                setMessageModalVisible={setMessageModalVisible}
              />
            }
          >
            {renderTreeNodes(item.children)}
          </TreeNode>
        );
      }
      return (
        <TreeNode
          {...item}
          title={
            <Node
              data={item}
              index={index}
              selectedKeys={selectedKeys}
              rightClickedKey={rightClickedKey}
              setSelectedKeys={setSelectedKeys}
              setFinalSelectedKeys={setFinalSelectedKeys}
              setMessageModalVisible={setMessageModalVisible}
            />
          }
        />
      );
    });
  };

  // ANCHOR return
  return (
    <div className="contents-wrap">
      <div className="page-title-wrap">
        <h4 className="page-title">조직도</h4>
        <div className="local-search-wrap">
          <input
            type="text"
            className="local-search"
            placeholder="멤버 검색"
            title="이하와 같은 정보로 멤버를 검색해주세요. 사용자ID, 사용자명, 부서명, 직위명, 직책명, 직급명, 전화번호"
            value={searchKeyword}
            onChange={handleKeywordChange}
            onKeyDown={handleSearch}
          />
        </div>
      </div>
      <main className="main-wrap">
        <div className="rc-tree-wrap">
          {treeData.length && !searchMode ? (
            <Tree
              loadData={load}
              showLine
              showIcon={false}
              onSelect={handleSelect}
              onExpand={handleExpand}
              switcherIcon={switcherGenerator}
              expandedKeys={expandedKeys}
              onRightClick={handleRightClick}
              multiple
            >
              {renderTreeNodes(treeData)}
            </Tree>
          ) : (
            <Tree
              showLine
              showIcon={false}
              onSelect={handleSelect}
              onExpand={handleExpand}
              switcherIcon={switcherGenerator}
              expandedKeys={[Efavorite.SEARCH_RESULT]}
              onRightClick={handleRightClick}
              multiple
            >
              {renderTreeNodes(searchResult)}
            </Tree>
          )}
        </div>
      </main>
      <Modal
        isOpen={messageModalVisible}
        onRequestClose={() => {
          setMessageModalVisible(false);
        }}
        style={messageInputModalStyle}
        shouldCloseOnOverlayClick={false}
      >
        <MessageInputModal
          closeModalFunction={() => {
            setMessageModalVisible(false);
          }}
          selectedNode={finalFinalSelectedKeys}
        />
      </Modal>
      <Modal
        isOpen={addToFavoriteModalVisible}
        onRequestClose={() => {
          setAddToFavoriteModalVisible(false);
        }}
        style={commonModalStyles}
      >
        <AddToFavoriteModal
          closeModalFunction={() => {
            setAddToFavoriteModalVisible(false);
          }}
          selectedKeys={finalFinalSelectedKeys}
        />
      </Modal>
      <Modal
        isOpen={addGroupToFavoriteModalVisible}
        onRequestClose={() => {
          setAddGroupToFavoriteModalVisible(false);
        }}
        style={commonModalStyles}
      >
        <AddGroupToFavoriteModal
          closeModalFunction={() => {
            setAddGroupToFavoriteModalVisible(false);
          }}
          selectedGroupInfo={selectedGroupInfo}
        />
      </Modal>
      <ContextMenu
        style={{
          top: pageY,
          left: leftPosition,
          display: groupContextMenuVisible ? `block` : `none`,
        }}
      >
        <div onMouseLeave={handleGroupContextMenuClose} tabIndex={1}>
          <ul>
            <li onClick={handleAddGroupToFavorite}>
              즐겨찾기에 그룹 멤버 추가
            </li>
            <li onClick={handleSendGroupMessage}>그룹 쪽지 발송</li>
            <li onClick={handleSendGroupChat}>그룹 채팅 시작</li>
          </ul>
        </div>
      </ContextMenu>
      <ContextMenu
        style={{
          top: pageY,
          left: leftPosition,
          display: userContextMenuVisible ? `block` : `none`,
        }}
      >
        <div onMouseLeave={handleUserContextMenuClose} tabIndex={1}>
          <ul>
            <li
              onClick={() => {
                setAddToFavoriteModalVisible(true);
              }}
            >
              즐겨찾기에 추가
            </li>
            <li
              onClick={() => {
                setMessageModalVisible(true);
              }}
            >
              쪽지 보내기
            </li>
            <li onClick={handleChat}>채팅 시작</li>
          </ul>
        </div>
      </ContextMenu>
    </div>
  );
}

const Switcher = styled.div`
  background-color: #ebedf1;
  padding: 4px 8px;
  height: 30px;
  border-bottom: 1px solid #dfe2e8;
`;

const ContextMenu = styled.div`
  position: absolute;
  background-color: #fff;
  border-radius: 10px;
  box-shadow: 0px 0px 4px #dfe2e8;
  user-select: none;

  ul li {
    background-clip: border-box;
    padding: 15px;

    &:hover {
      cursor: pointer;
      background-color: #f5f6f8;
      border-radius: 10px;
      color: #11378d;
    }
  }
`;
