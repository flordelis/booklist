import React, { SFC, useState, useLayoutEffect, useContext, useRef } from "react";
import { buildMutation, useMutation } from "micro-graphql-react";

import updateBookSubjects from "graphQL/books/updateBookSubjects.graphql";

import BootstrapButton, { AjaxButton } from "app/components/bootstrapButton";
import SelectAvailable from "app/components/availableTagsOrSubjects";

import Modal from "app/components/modal";
import { useStackedSubjects, filterSubjects } from "app/subjectsState";
import { MutationOf, Mutations } from "graphql-typings";
import FlexRow from "app/components/layout/FlexRow";
import Stack from "app/components/layout/Stack";
import FlowItems from "app/components/layout/FlowItems";
import { Tabs, TabHeaders, TabHeader, TabContents, TabContent } from "app/components/layout/Tabs";
import DisplaySelectedSubjects from "app/components/displaySelectedSubjects";

interface ILocalProps {
  modifyingBooks: any[];
  onDone: any;
}

const BookSubjectSetter: SFC<ILocalProps> = props => {
  const { subjectHash, subjectsUnwound } = useStackedSubjects();
  const [currentTab, setTab] = useState("subjects");
  const [addingSubjects, setAddingSubjects] = useState([]);
  const [removingSubjects, setRemovingSubjects] = useState([]);
  const resetSubjects = () => {
    setRemovingSubjects([]);
    setAddingSubjects([]);
  };

  useLayoutEffect(() => {
    if (props.modifyingBooks.length) {
      resetSubjects();
    }
  }, [props.modifyingBooks.length]);

  const { runMutation, running } = useMutation<MutationOf<Mutations["updateBooks"]>>(buildMutation(updateBookSubjects));

  const save = () => {
    let args = { books: props.modifyingBooks.map(b => b._id), add: addingSubjects, remove: removingSubjects };
    return Promise.resolve(runMutation(args)).then(() => {
      props.onDone();
    });
  };
  const addingSubjectSet = (adding, { _id }) => setAddingSubjects(adding ? addingSubjects.concat(_id) : addingSubjects.filter(x => x != _id));
  const subjectSelectedToAdd = addingSubjectSet.bind(null, true);

  const removingSubjectSet = (adding, { _id }) => setRemovingSubjects(adding ? removingSubjects.concat(_id) : removingSubjects.filter(x => x != _id));
  const subjectSelectedToRemove = removingSubjectSet.bind(null, true);

  const dontAddSubject = addingSubjectSet.bind(null, false);
  const dontRemoveSubject = removingSubjectSet.bind(null, false);
  const modifyingBooks = props.modifyingBooks || [];
  const selectRef = useRef(null);

  return (
    <Modal
      className="fade"
      isOpen={!!modifyingBooks.length}
      onHide={() => {
        props.onDone();
        setTab("subjects");
      }}
      headerCaption="Add / Remove Subjects:"
      focusRef={selectRef}
    >
      <Tabs defaultTab="subjects">
        <TabHeaders>
          <TabHeader tabName="subjects">
            <a ref={selectRef}>Choose subjects</a>
          </TabHeader>
          <TabHeader tabName="books">
            <a>For books</a>
          </TabHeader>
        </TabHeaders>
        <TabContents>
          <TabContent tabName="subjects">
            <FlexRow>
              <div className="col-xs-3">
                <SelectAvailable
                  placeholder="Adding"
                  items={subjectsUnwound}
                  currentlySelected={addingSubjects}
                  onSelect={subjectSelectedToAdd}
                  filter={filterSubjects}
                />
              </div>
              <div className="col-xs-9" style={{ display: "flex", flexWrap: "wrap" }}>
                <DisplaySelectedSubjects currentlySelected={addingSubjects} onRemove={dontAddSubject} />
              </div>

              <div className="col-xs-3">
                <SelectAvailable
                  placeholder="Removing"
                  items={subjectsUnwound}
                  currentlySelected={removingSubjects}
                  onSelect={subjectSelectedToRemove}
                  filter={filterSubjects}
                />
              </div>
              <div className="col-xs-9" style={{ display: "flex", flexWrap: "wrap" }}>
                <DisplaySelectedSubjects currentlySelected={removingSubjects} onRemove={dontRemoveSubject} />
              </div>

              <div className="col-xs-12">
                <BootstrapButton onClick={resetSubjects} preset="default-xs">
                  Reset subjects
                </BootstrapButton>
              </div>
            </FlexRow>
          </TabContent>
          <TabContent tabName="books">
            <Stack style={{ fontSize: "14px" }}>
              {modifyingBooks.map(book => (
                <div key={book._id}>{book.title}</div>
              ))}
            </Stack>
          </TabContent>
        </TabContents>
      </Tabs>
      <hr />
      <div className="standard-modal-footer">
        <FlowItems>
          <AjaxButton preset="primary" runningText="Setting" finishedText="Saved" onClick={save}>
            Set
          </AjaxButton>
          <BootstrapButton preset="" onClick={props.onDone}>
            Cancel
          </BootstrapButton>
        </FlowItems>
      </div>
    </Modal>
  );
};

export default BookSubjectSetter;
