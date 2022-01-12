/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React, { useEffect, memo, useMemo } from "react";
import clsx from "clsx";
import {
  isActiveSidebarItem,
  usePrevious,
  Collapsible,
  useCollapsible,
  findFirstCategoryLink,
  ThemeClassNames,
} from "@docusaurus/theme-common";
import Link from "@docusaurus/Link";
import isInternalUrl from "@docusaurus/isInternalUrl";
import { translate } from "@docusaurus/Translate";
import IconExternalLink from "@theme/IconExternalLink";
import styles from "./styles.module.css";
import useIsBrowser from "@docusaurus/useIsBrowser"; // Optimize sidebar at each "level"
// TODO this item should probably not receive the "activePath" props
// TODO this triggers whole sidebar re-renders on navigation

export const DocSidebarItems = memo(({ items, ...props }) => (
  <>
    {items.map((item, index) => (
      <DocSidebarItem
        key={index} // sidebar is static, the index does not change
        item={item}
        {...props}
      />
    ))}
  </>
));
export default function DocSidebarItem({ item, ...props }) {
  switch (item.type) {
    case "category":
      if (item.items.length === 0) {
        return null;
      }

      return <DocSidebarItemCategory item={item} {...props} />;

    case "link":
      if (item.customProps) {
        if (item.customProps.verionsed == "versioned") {
          return <DocSidebarVersionDropdown item={item} {...props} />;
        }
      }
    default:
      return <DocSidebarItemLink item={item} {...props} />;
  }
} // If we navigate to a category and it becomes active, it should automatically expand itself

function DocSidebarVersionDropdown({
  item,
  onItemClick,
  activePath,
  ...props
}) {
  const { siteConfig } = useDocusaurusContext();

  // Mobile sidebar not visible on hydration: can avoid SSR rendering

  return (
    <div
      className="menu__list-item dropdown dropdown--hoverable button button--block button--secondary"
      style={{
        marginTop: "-.5rem",
        padding: "-.5rem 0 0 0",
        height: "40px",
        position: "sticky",
        top: "-.5rem",
        zIndex: "200",
        marginBottom: "0",
        backgroundColor: "var(--ifm-font-color-base)",
      }}
    >
      <a
        className="menu__link"
        style={{
          color: "var(--ifm-version-background)",
        }}
      >
        Select API Version: &ensp;
        <b>{item.label} ▼</b>
      </a>
      <ul className="dropdown__menu">
        {siteConfig.customFields.api_versions.map((Ver, i) => (
          <li key={i}>
            <Link
              className={
                "dropdown__link " +
                (item.label === Ver.version ? "dropdown__link--active" : "")
              }
              to={Ver.to}
            >
              {Ver.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useAutoExpandActiveCategory({ isActive, collapsed, setCollapsed }) {
  const wasActive = usePrevious(isActive);
  useEffect(() => {
    const justBecameActive = isActive && !wasActive;

    if (justBecameActive && collapsed) {
      setCollapsed(false);
    }
  }, [isActive, wasActive, collapsed, setCollapsed]);
} // When a collapsible category has no link, we still link it to its first child during SSR as a temporary fallback
// This allows to be able to navigate inside the category even when JS fails to load, is delayed or simply disabled
// React hydration becomes an optional progressive enhancement
// see https://github.com/facebookincubator/infima/issues/36#issuecomment-772543188
// see https://github.com/facebook/docusaurus/issues/3030

function useCategoryHrefWithSSRFallback(item) {
  const isBrowser = useIsBrowser();
  return useMemo(() => {
    if (item.href) {
      return item.href;
    } // In these cases, it's not necessary to render a fallback
    // We skip the "findFirstCategoryLink" computation

    if (isBrowser || !item.collapsible) {
      return undefined;
    }

    return findFirstCategoryLink(item);
  }, [item, isBrowser]);
}

function DocSidebarItemCategory({
  item,
  onItemClick,
  activePath,
  level,
  ...props
}) {
  const { items, label, collapsible, className, href } = item;
  const hrefWithSSRFallback = useCategoryHrefWithSSRFallback(item);
  const isActive = isActiveSidebarItem(item, activePath);
  const { collapsed, setCollapsed, toggleCollapsed } = useCollapsible({
    // active categories are always initialized as expanded
    // the default (item.collapsed) is only used for non-active categories
    initialState: () => {
      if (!collapsible) {
        return false;
      }

      return isActive ? false : item.collapsed;
    },
  });
  useAutoExpandActiveCategory({
    isActive,
    collapsed,
    setCollapsed,
  });
  return (
    <li
      className={clsx(
        ThemeClassNames.docs.docSidebarItemCategory,
        ThemeClassNames.docs.docSidebarItemCategoryLevel(level),
        "menu__list-item",
        {
          "menu__list-item--collapsed": collapsed,
        },
        className
      )}
    >
      <div className="menu__list-item-collapsible">
        <Link
          className={clsx("menu__link", {
            "menu__link--sublist": collapsible && !href,
            "menu__link--active": isActive,
            [styles.menuLinkText]: !collapsible,
            [styles.hasHref]: !!hrefWithSSRFallback,
          })}
          onClick={
            collapsible
              ? (e) => {
                  onItemClick?.(item);

                  if (href) {
                    setCollapsed(false);
                  } else {
                    e.preventDefault();
                    toggleCollapsed();
                  }
                }
              : () => {
                  onItemClick?.(item);
                }
          }
          href={collapsible ? hrefWithSSRFallback ?? "#" : hrefWithSSRFallback}
          {...props}
        >
          {label}
        </Link>
        {href && collapsible && (
          <button
            aria-label={translate(
              {
                id: "theme.DocSidebarItem.toggleCollapsedCategoryAriaLabel",
                message: "Toggle the collapsible sidebar category '{label}'",
                description:
                  "The ARIA label to toggle the collapsible sidebar category",
              },
              {
                label,
              }
            )}
            type="button"
            className="clean-btn menu__caret"
            onClick={(e) => {
              e.preventDefault();
              toggleCollapsed();
            }}
          />
        )}
      </div>

      <Collapsible lazy as="ul" className="menu__list" collapsed={collapsed}>
        <DocSidebarItems
          items={items}
          tabIndex={collapsed ? -1 : 0}
          onItemClick={onItemClick}
          activePath={activePath}
          level={level + 1}
        />
      </Collapsible>
    </li>
  );
}

function DocSidebarItemLink({
  item,
  onItemClick,
  activePath,
  level,
  ...props
}) {
  const { href, label, className, customProps } = item;
  const isActive = isActiveSidebarItem(item, activePath);
  var method = "noop";
  if (customProps) {
    method = customProps.method;
  }
  return (
    <li
      className={clsx(
        ThemeClassNames.docs.docSidebarItemLink,
        ThemeClassNames.docs.docSidebarItemLinkLevel(level),
        "menu__list-item",
        className
      )}
      key={label}
    >
      <Link
        className={clsx("menu__link", method, {
          "menu__link--active": isActive,
        })}
        aria-current={isActive ? "page" : undefined}
        to={href}
        {...(isInternalUrl(href) && {
          onClick: onItemClick ? () => onItemClick(item) : undefined,
        })}
        {...props}
      >
        {isInternalUrl(href) ? (
          label
        ) : (
          <span>
            {label}
            <IconExternalLink />
          </span>
        )}
      </Link>
    </li>
  );
}
