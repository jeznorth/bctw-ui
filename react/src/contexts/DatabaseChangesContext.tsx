import React, { useContext, useEffect, useState } from 'react';
import { DatabaseContext } from './DatabaseContext';

export type IDatabaseChanges = PouchDB.Core.ChangesResponseChange<any> | PouchDB.Core.ChangesResponse<any> | any;

export const DatabaseChangesContext = React.createContext<IDatabaseChanges>(null);

/**
 * Provides access to a database changes object, which contains information about the most recent database updates.
 *
 * @param {*} props
 * @return {*}
 */
export const DatabaseChangesContextProvider: React.FC = (props) => {
  const databaseContext = useContext(DatabaseContext);

  const [databaseChanges, setDatabaseChanges] = useState<IDatabaseChanges>(null);
  const [changesListener, setChangesListener] = useState<PouchDB.Core.Changes<any>>(null);

  const setupDatabase = async (): Promise<void> => {
    if (!changesListener || changesListener['isCancelled']) {
      const listener = databaseContext.database
        .changes({ live: true, since: 'now' })
        .on('change', (change) => {
          // console.log(`db change ${JSON.stringify(change)}`);
          setDatabaseChanges(change);
        })
        .on('complete', (final) => (): void => setDatabaseChanges(final))
        .on('error', (error) => (): void => setDatabaseChanges(error));

      setChangesListener(listener);
    }
  };

  const cleanupDatabase = (): void=> {
    if (changesListener) {
      changesListener.cancel();
    }
  };

  // todo: Update [] dependencies to properly run cleanup (if keycloak expires?)
  useEffect(() => {
    setupDatabase();

    return (): void => {
      cleanupDatabase();
    };
  }, [databaseContext]);

  return <DatabaseChangesContext.Provider value={databaseChanges}>{props.children}</DatabaseChangesContext.Provider>;
};
