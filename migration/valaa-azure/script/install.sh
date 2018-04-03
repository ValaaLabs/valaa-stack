sudo cp /etc/apache2/mods-available/proxy* /etc/apache2/mods-enabled/
sudo cp /etc/apache2/mods-available/xml2enc.load /etc/apache2/mods-enabled/
sudo cp /etc/apache2/mods-available/slotmem_shm.load /etc/apache2/mods-enabled/
sudo mv 000-default.conf /etc/apache2/sites-enabled/000-default.conf
curl --silent https://deb.nodesource.com/gpgkey/nodesource.gpg.key | sudo apt-key add -
echo "deb https://deb.nodesource.com/node_6.x $(lsb_release -s -c) main" | sudo tee /etc/apt/sources.list.d/nodesource.list
echo "deb-src https://deb.nodesource.com/node_6.x $(lsb_release -s -c) main" | sudo tee -a /etc/apt/sources.list.d/nodesource.list
sudo apt-get update
sudo apt-get install git nodejs -y
sudo npm install -g pm2
ssh-keyscan github.com >> ~/.ssh/known_hosts
git clone git@github.com:ValaaLabs/inspire.git
cd inspire 
npm install
pm2 start --name valaa npm -- start
sudo pm2 startup
pm2 save
sudo service apache2 restart