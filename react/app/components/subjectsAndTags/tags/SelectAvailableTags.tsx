import React, { FunctionComponent, useContext } from "react";
import SelectAvailableItems from "../AvailableTagsOrSubjects";
import { filterTags, useTagsState } from "app/state/tagsState";

type LocalProps = { currentlySelected: string[]; onSelect: any };

const SelectAvailableTags: FunctionComponent<LocalProps> = props => {
  const { tags } = useTagsState();
  return (
    <SelectAvailableItems placeholder="Tags" items={tags} currentlySelected={props.currentlySelected} onSelect={props.onSelect} filter={filterTags} />
  );
};

export default SelectAvailableTags;
